import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'students_meta'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {

      table.dropUnique(['aadhar_dise_no']); // Step 1: Drop UNIQUE constraint
      table.bigInteger('aadhar_dise_no').nullable().alter() // Step 2: Make nullable
      table.unique('aadhar_dise_no') // Step 3: Re-add UNIQUE constraint

      table.string('birth_place', 50).nullable().alter({ alterNullable: true });
      table.string('birth_place_in_guj', 50).nullable().alter({ alterNullable: true });

      table.string('religion', 50).nullable().alter({ alterNullable: true });
      table.string('religion_in_guj', 50).nullable().alter({ alterNullable: true });

      table.string('caste', 100).nullable().alter({ alterNullable: true });
      table.string('caste_in_guj', 100).nullable().alter({ alterNullable: true });
      table.enum('category', ['ST', 'SC', 'OBC', 'OPEN']).nullable().alter({ alterNullable: true });

      table.enum('residence_type' , ['day_scholar' , 'residential' , 'semi_residential']).nullable().alter({ alterNullable: true });
      table.date('admission_date').nullable().alter({ alterNullable: true });

      table.enum('blood_group', ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-']).nullable().alter({ alterNullable: true });

      table.dropForeign('admission_class_id') // Step 1: Drop foreign key
      table.integer('admission_class_id').unsigned().nullable().alter() // Step 2: Alter column
      table.foreign('admission_class_id').references('id').inTable('classes').onDelete('CASCADE') // Step 3: Add FK back

      table.string('address', 100).nullable().alter({ alterNullable: true });
      table.string('district', 100).nullable().alter({ alterNullable: true });
      table.string('city', 100).nullable().alter({ alterNullable: true });
      table.string('state', 100).nullable().alter({ alterNullable: true });
      table.bigInteger('postal_code').unsigned().nullable().alter({ alterNullable: true });

      table.string('bank_name', 100).nullable().alter({ alterNullable: true });

      table.dropUnique(['account_no']); // Step 1: Drop UNIQUE constraint
      table.bigInteger('account_no').unsigned().nullable().alter() // Step 2: Make nullable
      table.unique('account_no') // Step 3: Re-add UNIQUE constraint

      table.string('IFSC_code', 15).nullable().alter({ alterNullable: true });

    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.increments('id')

      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }
}