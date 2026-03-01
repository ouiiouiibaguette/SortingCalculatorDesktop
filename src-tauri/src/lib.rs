#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  let migrations = vec![
      tauri_plugin_sql::Migration {
          version: 1,
          description: "create_initial_tables",
          sql: "
              CREATE TABLE IF NOT EXISTS customers (
                  id TEXT PRIMARY KEY,
                  name TEXT NOT NULL,
                  email TEXT,
                  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
              );
              CREATE TABLE IF NOT EXISTS offers (
                  id TEXT PRIMARY KEY,
                  customer_id TEXT NOT NULL,
                  project_number TEXT NOT NULL,
                  designation TEXT NOT NULL,
                  reference TEXT NOT NULL,
                  cadence_per_hour REAL NOT NULL,
                  price_per_piece REAL NOT NULL,
                  quantity_offer INTEGER NOT NULL,
                  alert_threshold INTEGER NOT NULL,
                  quantity_in_stock INTEGER NOT NULL,
                  is_archived BOOLEAN NOT NULL DEFAULT 0,
                  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                  FOREIGN KEY(customer_id) REFERENCES customers(id)
              );
              CREATE TABLE IF NOT EXISTS sorting_logs (
                  id TEXT PRIMARY KEY,
                  offer_id TEXT NOT NULL,
                  customer_id TEXT NOT NULL,
                  date_performed TEXT NOT NULL,
                  pieces_sorted INTEGER NOT NULL,
                  cadence_snapshot REAL NOT NULL,
                  hours_decimal REAL NOT NULL,
                  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                  FOREIGN KEY(offer_id) REFERENCES offers(id),
                  FOREIGN KEY(customer_id) REFERENCES customers(id)
              );
              CREATE TABLE IF NOT EXISTS settings (
                  id TEXT PRIMARY KEY,
                  locale TEXT NOT NULL,
                  alerts_enabled BOOLEAN NOT NULL DEFAULT 1,
                  email_subject_template TEXT,
                  email_body_template TEXT,
                  export_default_format TEXT,
                  export_default_folder TEXT
              );
          ",
          kind: tauri_plugin_sql::MigrationKind::Up,
      }
  ];

  tauri::Builder::default()
    .plugin(tauri_plugin_fs::init())
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_sql::Builder::default().add_migrations("sqlite:sorting.db", migrations).build())
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
