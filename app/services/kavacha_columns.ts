import KavachaCipher from '#services/kavacha_cipher'

/**
 * Field-level encryption for sensitive database columns.
 *
 *  - The column holds `enc1.…` ciphertext. Legacy plain values still read fine until the
 *    `kavacha:seal` command has encrypted them.
 *  - A companion `<column>_bidx` column holds a keyed hash, so exact lookups and uniqueness
 *    checks work without decrypting rows. Partial (LIKE) search on these columns is not possible.
 *
 * Usage in a model:
 *   @column(KavachaColumns.options(STAFF_PII[0]))  declare aadhar_no: number | null
 *   @column({ serializeAs: null })                 declare aadhar_no_bidx: string | null
 *   @beforeSave() static sealIndexes(m: Staff) { KavachaColumns.refreshIndexes(m, STAFF_PII) }
 */

export interface PiiColumn {
  table: string
  prop: string
  /** Name of the blind-index property/column. */
  indexProp: string
  /** Return a number when the value is all digits and safely representable (keeps API types). */
  numeric?: boolean
  /** Upper-case before hashing and storing (PAN). */
  upper?: boolean
}

export const PII_COLUMNS: PiiColumn[] = [
  { table: 'staff', prop: 'aadhar_no', indexProp: 'aadhar_no_bidx', numeric: true },
  { table: 'staff', prop: 'pan_card_no', indexProp: 'pan_card_no_bidx', upper: true },
  { table: 'staff', prop: 'account_no', indexProp: 'account_no_bidx', numeric: true },
  { table: 'staff', prop: 'epf_uan_no', indexProp: 'epf_uan_no_bidx', numeric: true },
  { table: 'students', prop: 'aadhar_no', indexProp: 'aadhar_no_bidx', numeric: true },
  { table: 'students_meta', prop: 'aadhar_dise_no', indexProp: 'aadhar_dise_no_bidx', numeric: true },
  { table: 'students_meta', prop: 'account_no', indexProp: 'account_no_bidx', numeric: true },
]

const refOf = (col: PiiColumn) => `${col.table}.${col.prop}`

const normalize = (col: PiiColumn, value: unknown): string | null => {
  if (value === null || value === undefined) return null
  let text = String(value).replace(/[\s-]/g, '')
  if (col.upper) text = text.toUpperCase()
  if (text === '' || text === '0') return null
  return text
}

class KavachaColumns {
  forTable(table: string): PiiColumn[] {
    return PII_COLUMNS.filter((c) => c.table === table)
  }

  find(table: string, prop: string): PiiColumn {
    const col = PII_COLUMNS.find((c) => c.table === table && c.prop === prop)
    if (!col) throw new Error(`${table}.${prop} is not registered in PII_COLUMNS`)
    return col
  }

  /** Lucid column options (prepare/consume) for an encrypted column. */
  options(col: PiiColumn) {
    return {
      prepare: (value: unknown) => {
        const text = normalize(col, value)
        if (text === null) return null
        return KavachaCipher.isSealedField(text) ? text : KavachaCipher.sealField(text, refOf(col))
      },
      consume: (value: unknown) => {
        if (value === null || value === undefined) return null
        let text = String(value)
        if (KavachaCipher.isSealedField(text)) text = KavachaCipher.openField(text, refOf(col))
        if (col.numeric && /^\d{1,15}$/.test(text)) return Number(text)
        return text
      },
    }
  }

  /** Hash used for exact-match lookups and uniqueness, e.g. where('aadhar_no_bidx', index(...)). */
  index(table: string, prop: string, value: unknown): string | null {
    const col = this.find(table, prop)
    const text = normalize(col, value)
    return text === null ? null : KavachaCipher.blindIndex(refOf(col), text)
  }

  /** Like index() but always a string, for where() clauses. An empty/invalid value matches nothing. */
  lookup(table: string, prop: string, value: unknown): string {
    return this.index(table, prop, value) ?? 'no-match'
  }

  /** Call from @beforeSave so the blind index follows the value. */
  refreshIndexes(model: any, columns: PiiColumn[]) {
    for (const col of columns) {
      if (model.$isNew || model.$dirty[col.prop] !== undefined) {
        model[col.indexProp] = this.index(col.table, col.prop, model[col.prop])
      }
    }
  }

  /** Plain text -> stored ciphertext + index, used by the backfill command. */
  sealForStorage(col: PiiColumn, raw: unknown): { sealed: string; index: string } | null {
    const text = normalize(col, raw)
    if (text === null) return null
    return {
      sealed: KavachaCipher.sealField(text, refOf(col)),
      index: KavachaCipher.blindIndex(refOf(col), text),
    }
  }
}

export default new KavachaColumns()
