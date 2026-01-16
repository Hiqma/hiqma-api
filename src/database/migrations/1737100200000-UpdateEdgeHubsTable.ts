import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class UpdateEdgeHubsTable1737100200000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('edge_hubs');
    
    if (!table) {
      console.log('edge_hubs table does not exist');
      return;
    }

    // Rename 'location' to 'address' if it exists
    const locationColumn = table.findColumnByName('location');
    if (locationColumn && !table.findColumnByName('address')) {
      await queryRunner.renameColumn('edge_hubs', 'location', 'address');
      console.log('Renamed location column to address in edge_hubs table');
    }

    // Add address column if it doesn't exist
    if (!table.findColumnByName('address')) {
      await queryRunner.addColumn(
        'edge_hubs',
        new TableColumn({
          name: 'address',
          type: 'varchar',
          isNullable: false,
          default: "''",
        }),
      );
      console.log('Added address column to edge_hubs table');
    }

    // Add latitude if missing
    if (!table.findColumnByName('latitude')) {
      await queryRunner.addColumn(
        'edge_hubs',
        new TableColumn({
          name: 'latitude',
          type: 'decimal',
          precision: 10,
          scale: 8,
          isNullable: true,
        }),
      );
      console.log('Added latitude column to edge_hubs table');
    }

    // Add longitude if missing
    if (!table.findColumnByName('longitude')) {
      await queryRunner.addColumn(
        'edge_hubs',
        new TableColumn({
          name: 'longitude',
          type: 'decimal',
          precision: 11,
          scale: 8,
          isNullable: true,
        }),
      );
      console.log('Added longitude column to edge_hubs table');
    }

    // Add description if missing
    if (!table.findColumnByName('description')) {
      await queryRunner.addColumn(
        'edge_hubs',
        new TableColumn({
          name: 'description',
          type: 'text',
          isNullable: true,
        }),
      );
      console.log('Added description column to edge_hubs table');
    }

    // Add metrics columns
    if (!table.findColumnByName('totalReaders')) {
      await queryRunner.addColumn(
        'edge_hubs',
        new TableColumn({
          name: 'totalReaders',
          type: 'integer',
          default: 0,
        }),
      );
      console.log('Added totalReaders column to edge_hubs table');
    }

    if (!table.findColumnByName('activeReaders')) {
      await queryRunner.addColumn(
        'edge_hubs',
        new TableColumn({
          name: 'activeReaders',
          type: 'integer',
          default: 0,
        }),
      );
      console.log('Added activeReaders column to edge_hubs table');
    }

    if (!table.findColumnByName('totalContent')) {
      await queryRunner.addColumn(
        'edge_hubs',
        new TableColumn({
          name: 'totalContent',
          type: 'integer',
          default: 0,
        }),
      );
      console.log('Added totalContent column to edge_hubs table');
    }

    if (!table.findColumnByName('dataTransferred')) {
      await queryRunner.addColumn(
        'edge_hubs',
        new TableColumn({
          name: 'dataTransferred',
          type: 'bigint',
          default: 0,
        }),
      );
      console.log('Added dataTransferred column to edge_hubs table');
    }

    if (!table.findColumnByName('lastMetricsUpdate')) {
      await queryRunner.addColumn(
        'edge_hubs',
        new TableColumn({
          name: 'lastMetricsUpdate',
          type: 'timestamp',
          isNullable: true,
        }),
      );
      console.log('Added lastMetricsUpdate column to edge_hubs table');
    }

    // Add authentication columns
    if (!table.findColumnByName('allowAnonymousAccess')) {
      await queryRunner.addColumn(
        'edge_hubs',
        new TableColumn({
          name: 'allowAnonymousAccess',
          type: 'boolean',
          default: true,
        }),
      );
      console.log('Added allowAnonymousAccess column to edge_hubs table');
    }

    if (!table.findColumnByName('requireStudentAuthentication')) {
      await queryRunner.addColumn(
        'edge_hubs',
        new TableColumn({
          name: 'requireStudentAuthentication',
          type: 'boolean',
          default: false,
        }),
      );
      console.log('Added requireStudentAuthentication column to edge_hubs table');
    }

    if (!table.findColumnByName('authenticationMessage')) {
      await queryRunner.addColumn(
        'edge_hubs',
        new TableColumn({
          name: 'authenticationMessage',
          type: 'text',
          isNullable: true,
        }),
      );
      console.log('Added authenticationMessage column to edge_hubs table');
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('edge_hubs');
    
    if (!table) {
      return;
    }

    // Remove columns in reverse order
    const columnsToRemove = [
      'authenticationMessage',
      'requireStudentAuthentication',
      'allowAnonymousAccess',
      'lastMetricsUpdate',
      'dataTransferred',
      'totalContent',
      'activeReaders',
      'totalReaders',
      'description',
      'longitude',
      'latitude',
    ];

    for (const columnName of columnsToRemove) {
      if (table.findColumnByName(columnName)) {
        await queryRunner.dropColumn('edge_hubs', columnName);
        console.log(`Dropped ${columnName} column from edge_hubs table`);
      }
    }

    // Rename address back to location if needed
    if (table.findColumnByName('address')) {
      await queryRunner.renameColumn('edge_hubs', 'address', 'location');
      console.log('Renamed address column back to location in edge_hubs table');
    }
  }
}
