const path = require("path");
const Utility = require("./Utility");
const { SlowBuffer } = require("buffer");

class Child extends Utility {
  getMasterDataFilePath() {
    return path.join(__dirname, "master_data.csv");
  }

  extractOtp(message) {
    if (!message || typeof message !== "string") return "nan";

    // Step 0: Ignore irrelevant or promotional messages

      const lowerMsg = message.toLowerCase();
      if (
        lowerMsg.startsWith("caution")  ||
        lowerMsg.includes("pool") ||          // contains 'pool'
        lowerMsg.includes("entry fee") ||     // contains 'entry fee'
        lowerMsg.includes("click here")  ||
        lowerMsg.includes("shopping experience")
        
    ) return "nan";

    if (/\bbuy\b/i.test(message) && /\bfree\b/i.test(message)) return "";


    // Step 1: Clean the message
    const cleanMessage = this.cleanMessage(message);

    // Step 2: Tokenize for keyword-based search
    const tokens = cleanMessage.split(/\s+/).map(t => t.toLowerCase());

    // Step 3: Try keyword-based OTP extraction
    const otpFromKeywords = this.extractUsingKeywords(tokens, cleanMessage);
    if (otpFromKeywords) return otpFromKeywords;

    // Step 4: Check consecutive numbers
    const consecutiveMatch = cleanMessage.match(/\b\d{1,8}\s+(\d{4,8})\b/);
    if (consecutiveMatch) return consecutiveMatch[1];

    // Step 5: Exact 8-digit number
    const eightDigitMatch = cleanMessage.match(/\b\d{8}\b/);
    if (eightDigitMatch) return eightDigitMatch[0];

    // Step 6: Fallback: first 4–8 digit number
    const fallbackMatch = cleanMessage.match(/\b\d{4,8}\b|\b\d{3}-\d{3}\b/);
    if (fallbackMatch) {
      const number = fallbackMatch[0];
      const priceRegex = new RegExp(`\\b(?:mrp|at)\\D{0,3}${number}\\b`, "i");
      if (!priceRegex.test(cleanMessage)) return number.replace(/-/g, "");
    }

    return "nan";
  }

// Helper
cleanMessage(message) {
  return message
    // .replace(/["',]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    // Mask numbers right after ID
    .replace(/\bID\s+(\d{1,20})\b/gi, "ID")
    // Remove amounts, dates, phone/account numbers
    .replace(/\b(?:Rs\.?|INR|₹)\s*\d+(?:\.\d+)?\b/gi, "")
    .replace(/\b\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4}\b/g, "")
    .replace(/\b\d{9,20}\b/g, "")
    // Ignore date/time/year numbers
    .replace(/\b\d{4}[-.]\d{1,2}[-.]\d{1,2}\b/g, "")
    .replace(/\b\d{1,2}[-.]\d{1,2}[-.]\d{2,4}\b/g, "")
    .replace(/\b\d{1,2}:\d{2}(:\d{2})?\b/g, "")
    // Only remove years if preceded/followed by space and looks like a date context
      .replace(/\b\d{4}\b/g, (m, offset, str) => {
        const prevChar = str[offset - 1] || " ";
        const nextChar = str[offset + 4] || " ";
        if ((prevChar === "/" || prevChar === "-") || (nextChar === "/" || nextChar === "-")) {
          return (+m >= 1900 && +m <= 2099 ? "" : m);
        }
        return m; // keep other 4-digit numbers like OTPs
      })

    // Remove masked numbers like ****9312
    .replace(/\*+\d+/g, "")
    .replace(/\b\d+\+\b/g, "")
    .trim();
}


  // Helper: Keyword-based OTP extraction
  extractUsingKeywords(tokens, cleanMessage) {
    const otpKeywords = new Set([
      "otp", "one time password", "code", "password", "pin", "verification","attemp",
      "passcode", "secret", "secure code", "authentication code",
      "use", "enter", "is", "one-time", "verification code", ":", "refuse","valid","delivery code"
    ]);

    const eliminators = new Set([
      "do", "not", "share", "it", "with", "anyone",
      , "for", "minutes", "keep", "safe",
      "complete", "authentication", "verify", "account",
      "access", "transaction", "txn", "ending", "a/c"
    ]);

    const separators = new Set(["is", ":", "as","enter", "your", "for", "number"]);

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      if (eliminators.has(token)) continue;

      if (otpKeywords.has(token) || separators.has(token)) {
        // Forward check
        for (let j = 1; j <= 3 && i + j < tokens.length; j++) {
          const match = tokens[i + j].match(/^\d{4,8}$/);
          if (match) return match[0];
        }

        // Backward check if '.' nearby
        // ------------------not working fine not accurate + it has a static value to check for which is not a good approach-------------------------------------------
        // const keywordIndex = cleanMessage.indexOf(tokens[i]);
        // if (keywordIndex !== -1) {
        //   const afterKeyword = cleanMessage.slice(keywordIndex, keywordIndex + 8);
        //   if (afterKeyword.includes(".")) {
        //     for (let k = 1; k <= 3 && i - k >= 0; k++) {
        //       const backMatch = tokens[i - k].match(/^\d{4,8}$/);
        //       if (backMatch) return backMatch[0];
        //     }
        //   }
        // }
      }
    }
    return null;
  }
}

module.exports = Child;
