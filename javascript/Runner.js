const Child = require('./Child');

function main() {
    const obj = new Child();

    // Load CSV data: [[SMS, OTP_GT], ...]
    const csvData = obj.readFileData();

    // Predictions: [[SMS, Extracted], ...]
    const extractedData = csvData.map(row => {
        const sms = row[0];
        const otp = obj.extractOtp(sms);
        return [sms, otp];
    });

    // Write results and compare against ground truth
    obj.writeFile(extractedData, csvData);
}

main();
