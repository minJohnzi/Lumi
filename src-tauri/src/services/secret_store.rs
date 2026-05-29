use keyring::{Entry, Error as KeyringError};

const SERVICE_NAME: &str = "Lumi";

fn account_name(provider: &str) -> String {
    format!("llm_api_key:{provider}")
}

pub fn get_api_key(provider: &str) -> Result<Option<String>, String> {
    let account = account_name(provider);
    let entry = Entry::new(SERVICE_NAME, &account).map_err(|err| err.to_string())?;
    match entry.get_password() {
        Ok(value) => Ok(Some(value)),
        Err(KeyringError::NoEntry) => Ok(None),
        Err(err) => Err(err.to_string()),
    }
}

pub fn set_api_key(provider: &str, api_key: &str) -> Result<(), String> {
    let account = account_name(provider);
    let entry = Entry::new(SERVICE_NAME, &account).map_err(|err| err.to_string())?;
    if api_key.trim().is_empty() {
        match entry.delete_password() {
            Ok(()) | Err(KeyringError::NoEntry) => Ok(()),
            Err(err) => Err(err.to_string()),
        }
    } else {
        entry.set_password(api_key).map_err(|err| err.to_string())
    }
}
