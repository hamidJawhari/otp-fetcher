const Imap = require('imap');
const simpleParser = require('mailparser');

function fetchOtp(mail, pass) {
    return new Promise((resolve, reject) => {
        const imap = new Imap({
            user: mail,
            password: pass,
            host: 'imap.gmail.com',
            port: 993,
            tls: true,
            tlsOptions: { rejectUnauthorized: false }
        });

        let retries = 0;

        function searchForEmail() {
            if (retries >= 120) {
                return reject(new Error('No email found after 120 attempts'));
            }

            imap.openBox('INBOX', false, (err, box) => {
                if (err) {
                    return reject(err);
                }
                console.log('Opened inbox');

                imap.search(['UNSEEN', ['SUBJECT', 'BLS Visa Appointment - Email Verification']], (err, results) => {
                    if (err) {
                        console.error('Error searching for email:', err);
                        return reject(err);
                    }

                    if (results.length === 0) {
                        console.log('No email found');
                        retries++;
                        console.log(`Retrying... Attempt ${retries}`);
                        setTimeout(searchForEmail, 10); // Retry after 1 second
                    } else {
                        const fetchPromises = results.map(uid => new Promise((resolve, reject) => {
                            const fetch = imap.fetch(uid, { bodies: '' });
                            fetch.on('message', async (msg) => {
                                try {
                                    const parsedEmail = await parseEmail(msg);
                                    deleteEmail(imap, uid);
                                    const finalOtp = extractOTP(parsedEmail.text);
                                    resolve(finalOtp);
                                } catch (err) {
                                    console.error('Error parsing email:', err);
                                    reject(err);
                                }
                            });
                        }));

                        Promise.all(fetchPromises)
                            .then(otpValues => {
                                const otp = otpValues.find(value => value !== null && value !== '0');
                                if (otp) {
                                    resolve(otp);
                                } else {
                                    console.log('No OTP found');
                                    retries++;
                                    console.log(`Retrying... Attempt ${retries}`);
                                    setTimeout(searchForEmail, 10); // Retry after 1 second
                                }
                            })
                            .catch(err => {
                                reject(err);
                            });
                    }
                });
            });
        }


        imap.once('ready', () => {
            searchForEmail();
        });

        imap.once('error', (err) => {
            reject(err);
        });

        imap.connect();
    });
}
// Rest of your code remains the same...
function parseEmail(msg) {
    return new Promise((resolve, reject) => {
        let emailData = '';
        msg.on('body', (stream, info) => {
            stream.on('data', (chunk) => {
                emailData += chunk.toString('utf8');
            });
            stream.on('end', async () => {
                try {
                    const parsedEmail = await simpleParser.simpleParser(emailData);
                    resolve(parsedEmail);
                } catch (err) {
                    reject(err);
                }
            });
        });
        msg.once('end', () => {
            console.log('Finished parsing email');
        });
        msg.once('error', (err) => {
            reject(err);
        });
    });
}

function extractOTP(emailText) {
    const match = emailText.match(/\b(\d{6})\b/);
    if (match && match.length > 1) {
        return match[1]; // Return the OTP found in the email text
    }
    return null; // Return null if no OTP is found
}

function deleteEmail(imap, uid) {
    imap.addFlags(uid, ['\\Deleted'], function (err) {
        if (err) {
            console.log(err);
        } else {
            console.log("Email deleted!");
            imap.expunge(function(expungeErr) {
                if (expungeErr) {
                    console.log("Error expunging:", expungeErr);
                } else {
                    console.log("Expunged successfully!");
                }
            });
        }
    });
}


module.exports = { fetchOtp };
