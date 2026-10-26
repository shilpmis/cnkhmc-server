import { BaseCommand, flags } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'

/**
 * Encrypts existing plain values in the registered PII columns and fills their blind index.
 * Safe to re-run: rows that are already encrypted are skipped.
 *
 *   node ace kavacha:seal --dry-run     report only
 *   node ace kavacha:seal               encrypt
 */
export default class KavachaSeal extends BaseCommand {
  static commandName = 'kavacha:seal'
  static description = 'Encrypt existing PII column values and fill blind indexes'
  static options: CommandOptions = { startApp: true }

  @flags.boolean({ description: 'Report what would change without writing' })
  declare dryRun: boolean

  async run() {
    const { default: db } = await import('@adonisjs/lucid/services/db')
    const { default: KavachaColumns, PII_COLUMNS } = await import('#services/kavacha_columns').then((m) => ({
      default: m.default,
      PII_COLUMNS: m.PII_COLUMNS,
    }))
    const { default: KavachaCipher } = await import('#services/kavacha_cipher')

    const BATCH = 200
    let totalSealed = 0
    let totalSkipped = 0
    let totalDuplicates = 0

    for (const col of PII_COLUMNS) {
      let lastId = 0
      let sealed = 0
      let duplicates = 0

      for (;;) {
        const rows = await db
          .from(col.table)
          .select('id', col.prop)
          .where('id', '>', lastId)
          .whereNotNull(col.prop)
          .orderBy('id', 'asc')
          .limit(BATCH)

        if (rows.length === 0) break

        for (const row of rows) {
          lastId = row.id
          const current = row[col.prop]
          if (KavachaCipher.isSealedField(current)) {
            totalSkipped++
            continue
          }

          const result = KavachaColumns.sealForStorage(col, current)
          if (!result) {
            totalSkipped++
            continue
          }
          if (this.dryRun) {
            sealed++
            continue
          }

          try {
            await db
              .from(col.table)
              .where('id', row.id)
              .update({ [col.prop]: result.sealed, [col.indexProp]: result.index })
            sealed++
          } catch (error: any) {
            if (error.code === 'ER_DUP_ENTRY') {
              // Two records share the same value: keep it encrypted but leave the index empty.
              await db.from(col.table).where('id', row.id).update({ [col.prop]: result.sealed })
              duplicates++
              this.logger.warning(`${col.table}.${col.prop} id=${row.id} duplicates another record`)
            } else {
              throw error
            }
          }
        }
      }

      totalSealed += sealed
      totalDuplicates += duplicates
      this.logger.info(
        `${col.table}.${col.prop}: ${this.dryRun ? 'would encrypt' : 'encrypted'} ${sealed}` +
          (duplicates ? `, ${duplicates} duplicate(s) without index` : '')
      )
    }

    this.logger.success(
      `${this.dryRun ? 'Dry run' : 'Done'}: ${totalSealed} value(s) ${this.dryRun ? 'to encrypt' : 'encrypted'}, ` +
        `${totalSkipped} skipped, ${totalDuplicates} duplicate(s)`
    )
  }
}
