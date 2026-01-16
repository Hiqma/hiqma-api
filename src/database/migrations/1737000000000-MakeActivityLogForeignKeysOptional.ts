import { MigrationInterface, QueryRunner } from 'typeorm';

export class MakeActivityLogForeignKeysOptional1737000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop existing foreign key constraints that prevent analytics from being saved
    // when devices/students haven't been synced to cloud yet
    // Use IF EXISTS to handle cases where they may not exist
    await queryRunner.query(`
      ALTER TABLE "activity_logs" 
      DROP CONSTRAINT IF EXISTS "FK_a213cf89c831fd6bfb3836a47b4"
    `);
    
    await queryRunner.query(`
      ALTER TABLE "activity_logs" 
      DROP CONSTRAINT IF EXISTS "FK_86ae718ff61bf6138ec4a82b65d"
    `);
    
    await queryRunner.query(`
      ALTER TABLE "activity_logs" 
      DROP CONSTRAINT IF EXISTS "FK_activity_logs_student"
    `);
    
    await queryRunner.query(`
      ALTER TABLE "activity_logs" 
      DROP CONSTRAINT IF EXISTS "FK_activity_logs_device"
    `);

    // Don't recreate the constraints - allow analytics to be saved even if
    // the device/student records haven't been synced yet
    // The deviceId and studentId columns are already nullable, so this is safe
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Recreate the foreign key constraints if rolling back
    // Note: This may fail if there are activity_logs with deviceId/studentId
    // that don't exist in devices/students tables
    await queryRunner.query(`
      ALTER TABLE "activity_logs" 
      ADD CONSTRAINT "FK_a213cf89c831fd6bfb3836a47b4" 
      FOREIGN KEY ("deviceId") 
      REFERENCES "devices"("id") 
      ON DELETE NO ACTION 
      ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "activity_logs" 
      ADD CONSTRAINT "FK_86ae718ff61bf6138ec4a82b65d" 
      FOREIGN KEY ("studentId") 
      REFERENCES "students"("id") 
      ON DELETE NO ACTION 
      ON UPDATE NO ACTION
    `);
  }
}
