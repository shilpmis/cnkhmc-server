import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'schools'

  async up() {
    // 1. Temporarily change to VARCHAR to bypass ENUM truncation when we clear old data
    await this.schema.raw(`ALTER TABLE schools MODIFY COLUMN school_type VARCHAR(255)`)
    
    // 2. Set all existing rows to 'SCHOOL' to match the new ENUM rules
    await this.schema.raw(`UPDATE schools SET school_type = 'SCHOOL'`)
    
    // 3. Apply the final ENUM constraint safely
    await this.schema.raw(`ALTER TABLE schools MODIFY COLUMN school_type ENUM('SCHOOL', 'COLLEGE') DEFAULT 'SCHOOL'`)
  }

  async down() {
    await this.schema.raw(`ALTER TABLE schools MODIFY COLUMN school_type VARCHAR(255)`)
    await this.schema.raw(`UPDATE schools SET school_type = 'Public'`)
    await this.schema.raw(`ALTER TABLE schools MODIFY COLUMN school_type ENUM('Public', 'Private', 'Charter') DEFAULT 'Public'`)
  }
}