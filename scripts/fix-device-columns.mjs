import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

const renames = [
  // device_configs renames
  'ALTER TABLE device_configs RENAME COLUMN deviceUserId TO dcUserId',
  'ALTER TABLE device_configs RENAME COLUMN deviceType TO dcDeviceType',
  'ALTER TABLE device_configs RENAME COLUMN deviceName TO dcDeviceName',
  'ALTER TABLE device_configs RENAME COLUMN deviceProtocol TO dcProtocol',
  'ALTER TABLE device_configs RENAME COLUMN solarmanToken TO dcSolarmanToken',
  'ALTER TABLE device_configs RENAME COLUMN solarmanAppId TO dcSolarmanAppId',
  'ALTER TABLE device_configs RENAME COLUMN solarmanAppSecret TO dcSolarmanAppSecret',
  'ALTER TABLE device_configs RENAME COLUMN deviceSn TO dcDeviceSn',
  'ALTER TABLE device_configs RENAME COLUMN loggerId TO dcLoggerId',
  'ALTER TABLE device_configs RENAME COLUMN modbusHost TO dcModbusHost',
  'ALTER TABLE device_configs RENAME COLUMN modbusPort TO dcModbusPort',
  'ALTER TABLE device_configs RENAME COLUMN modbusUnitId TO dcModbusUnitId',
  'ALTER TABLE device_configs RENAME COLUMN maxChargePower TO dcMaxChargePower',
  'ALTER TABLE device_configs RENAME COLUMN maxDischargePower TO dcMaxDischargePower',
  'ALTER TABLE device_configs RENAME COLUMN maxSocPercent TO dcMaxSocPercent',
  'ALTER TABLE device_configs RENAME COLUMN minSocPercent TO dcMinSocPercent',
  'ALTER TABLE device_configs RENAME COLUMN deviceIsActive TO dcIsActive',
  'ALTER TABLE device_configs RENAME COLUMN deviceConfigCreatedAt TO dcCreatedAt',
  'ALTER TABLE device_configs RENAME COLUMN deviceConfigUpdatedAt TO dcUpdatedAt',
  // device_logs renames
  'ALTER TABLE device_logs RENAME COLUMN logActionId TO dlActionId',
  'ALTER TABLE device_logs RENAME COLUMN logDeviceConfigId TO dlDeviceConfigId',
  'ALTER TABLE device_logs RENAME COLUMN logDeviceType TO dlDeviceType',
  'ALTER TABLE device_logs RENAME COLUMN logCommand TO dlCommand',
  'ALTER TABLE device_logs RENAME COLUMN requestPayload TO dlRequestPayload',
  'ALTER TABLE device_logs RENAME COLUMN deviceResponse TO dlDeviceResponse',
  'ALTER TABLE device_logs RENAME COLUMN logSuccess TO dlSuccess',
  'ALTER TABLE device_logs RENAME COLUMN errorMessage TO dlErrorMessage',
  'ALTER TABLE device_logs RENAME COLUMN executionTimeMs TO dlExecutionTimeMs',
  'ALTER TABLE device_logs RENAME COLUMN logCreatedAt TO dlCreatedAt',
];

for (const sql of renames) {
  try {
    await conn.query(sql);
    console.log('OK:', sql.substring(0, 70));
  } catch(e) {
    console.log('SKIP:', e.message.substring(0, 90));
  }
}

// Verify final state
const [cols] = await conn.query('SHOW COLUMNS FROM device_configs');
console.log('\nFinal device_configs columns:', cols.map(r => r.Field));

const [logCols] = await conn.query('SHOW COLUMNS FROM device_logs');
console.log('Final device_logs columns:', logCols.map(r => r.Field));

await conn.end();
console.log('\nDone.');
