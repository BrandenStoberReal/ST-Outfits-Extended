# Custom Macro System

The `CustomMacroSystem` is a self-contained module designed to handle dynamic replacement of custom macros within text. This system is primarily used to inject real-time outfit information for both the user and the character/bot into various parts of the SillyTavern UI and chat context.

## Macro Format

The system recognizes macros in the following format:

`{{<type>_<slot>}}`

-   `<type>`: Specifies the target. It can be one of the following:
    -   `char` or `bot`: Refers to the AI character.
    -   `user`: Refers to the user.
    -   Any character's name (e.g., `{{Emma_topwear}}`): This is treated the same as `char`.
-   `<slot>`: The name of the clothing or accessory slot.

The system also supports a simple `{{user}}` macro, which is replaced with the current user's name.

### Supported Slots

**Clothing Slots:**

-   `headwear`
-   `topwear`
-   `topunderwear`
-   `bottomwear`
-   `bottomunderwear`
-   `footwear`
-   `footunderwear`

**Accessory Slots:**

-   `head-accessory`
-   `ears-accessory`
-   `eyes-accessory`
-   `mouth-accessory`
-   `neck-accessory`
-   `body-accessory`
-   `arms-accessory`
-   `hands-accessory`
-   `waist-accessory`
-   `bottom-accessory`
-   `legs-accessory`
-   `foot-accessory`

## Core Functionality

The `CustomMacroSystem` is implemented as a class with the following key methods:

-   **`replaceMacrosInText(text)`**: The main function that processes a string of text, finds all recognized macros, and replaces them with their corresponding current values from the `outfitStore`. If a slot is empty, it defaults to "None".

-   **`getCurrentSlotValue(macroType, slotName)`**: Retrieves the current item for a given slot and character type (`char`/`bot` or `user`) from the `outfitStore`.

-   **`getCurrentUserName()`**: Gets the current user's name from the SillyTavern context.

-   **`extractCustomMacros(text)`**: Scans a string of text and returns an array of all the custom macros it contains, along with their type, slot, and position in the text.

-   **`generateOutfitInfoString(botManager, userManager)`**: Generates a formatted string that lists the current outfits for the bot and the user. This string uses the custom macros, so it can be processed by `replaceMacrosInText` to produce the final output.

## How It Works

1.  **Initialization**: A single instance of the `CustomMacroSystem` is created and exported.
2.  **Macro Recognition**: The system uses a regular expression (`/\{\{(\w+)(?:_(\w+(?:-\w+)*))?\}\}/g`) to identify all macros in the specified format.
3.  **Data Retrieval**: When a macro is found, the system queries the `outfitStore` to get the current value for the corresponding character and slot.
4.  **Replacement**: The macro in the original text is replaced with the retrieved value. This process is done in reverse order of the matches to avoid issues with character indexing.

## Usage Example

If you have a string like:

`"The character is wearing {{char_topwear}} and the user has {{user_headwear}}."`

And the current state in `outfitStore` is:

-   Character's `topwear`: "a red shirt"
-   User's `headwear`: "a baseball cap"

Calling `customMacroSystem.replaceMacrosInText()` on that string would produce:

`"The character is wearing a red shirt and the user has a baseball cap."`
