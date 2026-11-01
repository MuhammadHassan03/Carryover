//! Saving and loading recipe files with an integrity hash.
//!
//! The hash catches corruption and casual edits. It is not a signature:
//! signing with a device key comes with the licensing work.

use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};

use crate::model::Recipe;
use crate::{Error, Result};

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct RecipeFile {
    format: String,
    sha256: String,
    recipe: Recipe,
}

const FORMAT: &str = "carryover-recipe/1";

fn digest(recipe: &Recipe) -> Result<String> {
    let bytes = serde_json::to_vec(recipe).map_err(|e| Error::Io(e.to_string()))?;
    Ok(hex::encode(Sha256::digest(bytes)))
}

pub fn to_json(recipe: &Recipe) -> Result<String> {
    let file = RecipeFile { format: FORMAT.into(), sha256: digest(recipe)?, recipe: recipe.clone() };
    serde_json::to_string_pretty(&file).map_err(|e| Error::Io(e.to_string()))
}

pub fn from_json(json: &str) -> Result<Recipe> {
    let file: RecipeFile = serde_json::from_str(json).map_err(|e| Error::BadRecipe(e.to_string()))?;
    if file.format != FORMAT {
        return Err(Error::BadRecipe(format!("unknown format {}", file.format)));
    }
    if digest(&file.recipe)? != file.sha256 {
        return Err(Error::BadRecipe("the file was changed or damaged after it was saved".into()));
    }
    Ok(file.recipe)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::scan::demo_recipe;

    #[test]
    fn round_trips() {
        let r = demo_recipe("t").unwrap();
        assert_eq!(from_json(&to_json(&r).unwrap()).unwrap(), r);
    }

    #[test]
    fn detects_tampering() {
        let r = demo_recipe("t").unwrap();
        let json = to_json(&r).unwrap().replace("Google.Chrome", "Evil.Chrome");
        assert!(from_json(&json).is_err());
    }
}
