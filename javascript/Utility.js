const fs = require('fs');
const path = require('path');

class Utility {
    constructor() {
        this.charsWithQuoteSet = new Set([',', '\n', '\r', '"']);
    }

    // To be overridden in Child.js
    getMasterDataFilePath() {
        return "";
    }

    // To be overridden in Child.js
    extractOtp(message) {
        return "";
    }

    // Reads CSV into array of rows
    readFileData() {
        let dataRows = [];
        const filePath = this.getMasterDataFilePath();

        if (filePath && fs.existsSync(filePath)) {
            try {
                const fileContent = fs.readFileSync(filePath, 'utf-8');
                const lines = fileContent.split(/\r?\n/);

                // skip header
                for (let i = 1; i < lines.length; i++) {
                    const line = lines[i];
                    if (!line.trim()) continue;

                    let columnValues = [];
                    if (this.tryGetDataRow(line, true, columnValues)) {
                        // Expecting: [Message, Expected]
                        dataRows.push(columnValues);
                    }
                }
            } catch (e) {
                console.log(e.message);
            }
        }
        return dataRows;
    }

    // Parses a single CSV line into columnValues
    tryGetDataRow(line, skipEmptyRows, columnValues) {
        columnValues.length = 0;

        const fields = [];
        let currentField = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];

            if (inQuotes) {
                if (char === '"' && i < line.length - 1 && line[i + 1] === '"') {
                    currentField += '"'; // escaped quote
                    i++;
                } else if (char === '"') {
                    inQuotes = false; // closing quote
                } else {
                    currentField += char;
                }
            } else {
                if (char === ',') {
                    fields.push(currentField.trim());
                    currentField = '';
                } else if (char === '"' && currentField.length === 0) {
                    inQuotes = true;
                } else {
                    currentField += char;
                }
            }
        }
        fields.push(currentField.trim());

        // skip empty rows
        if (skipEmptyRows && fields.every(f => !f)) {
            return false;
        }

        for (let f of fields) {
            columnValues.push(f);
        }
        return columnValues.length > 0;
    }

    // Writes CSV with accuracy report
    writeFile(predictions, groundTruth) {
        const filePath = this.getMasterDataFilePath();
        const folderPath = filePath ? path.dirname(filePath) : '';
        const outputFilePath = folderPath ? path.join(folderPath, 'output.csv') : 'output.csv';
        const failedCasesFilePath = folderPath ? path.join(folderPath, 'failedCases.csv') : 'failedCases.csv';

        let failCases = 0;
        let validCases = 0; // CHANGED: track only rows with Expected values
        let allLines = ["Message,Extracted,Expected"];
        let failedLines = ["Message,Extracted,Expected"];

        // helper to normalize undefined/null/empty → "nan"
        const normalize = (val) => {
            if (val === undefined || val === null) return "nan";
            const str = String(val).trim();
            return str === "" ? "nan" : str;
        };

        for (let i = 0; i < predictions.length; i++) {
            const [message, extractedRaw] = predictions[i];
            const expectedRaw = groundTruth[i] ? groundTruth[i][1] : undefined;

            const extracted = normalize(extractedRaw);
            const expected = normalize(expectedRaw);

            //CHANGED: If no Expected value, just log it but skip accuracy calculation
            if (expected === "nan") {
                const safeMessage = /[,"\n\r]/.test(message)
                    ? `"${message.replace(/"/g, '""')}"`
                    : message;
                const row = `${safeMessage},${extracted},${expected}`;
                allLines.push(row);
                continue; // skip counting in accuracy
            }

            validCases++; //count only rows with valid Expected

            let isFail = (extracted.toLowerCase() !== expected.toLowerCase());
            if (isFail) failCases++;

            // Escape quotes/special chars if needed
            const safeMessage = /[,"\n\r]/.test(message)
                ? `"${message.replace(/"/g, '""')}"`
                : message;

            const row = `${safeMessage},${extracted},${expected}`;
            allLines.push(row);
            if (isFail) failedLines.push(row);
        }

        try {
            fs.writeFileSync(outputFilePath, allLines.join('\n'));
            fs.writeFileSync(failedCasesFilePath, failedLines.join('\n'));

            // CHANGED: Accuracy only over valid cases
            const accuracy = (validCases > 0)
                ? ((validCases - failCases) / validCases) * 100
                : 0;

            console.log(`Accuracy:              ${accuracy.toFixed(2)}%`);
            console.log("---------------------------");
            console.log(`CSV writing completed successfully: ${outputFilePath}`);
        } catch (ex) {
            console.log("Error writing CSV: " + ex.message);
        }
    }
}

module.exports = Utility;
