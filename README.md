# 2FA iframe

A simple 2FA manager system designed to be embedded in an iframe. This application provides a 2FA token management system with two main interfaces:

1. **Configuration Page**: For adding, editing, and managing 2FA tokens
2. **Display Page**: For viewing and copying 2FA codes

## Features

- Add 2FA tokens via manual entry or QR code scanning
- Edit token names and notes
- Reorder tokens via drag and drop
- Delete tokens (soft delete)
- View all tokens with OTP codes
- Copy tokens with a single click
- Real-time countdown timer
- Responsive Material Design UI
- Secure backend for token generation

## Technologies Used

- **Frontend**: HTML, CSS, JavaScript (Vanilla)
- **Backend**: Node.js with Express
- **OTP Generation**: otplib
- **QR Code**: jsQR, qrcode
- **Web Server**: Nginx
- **Process Manager**: systemd
- **SSL**: Let's Encrypt

## Project Structure

```
2fa-iframe/
├── client/             # Client-side code (development only)
├── public/             # Static assets served by Nginx
│   ├── config.html     # Configuration page
│   ├── display.html    # Display page
│   ├── config.js       # Config page JavaScript
│   ├── display.js      # Display page JavaScript
│   └── styles.css      # Shared styles
├── server/             # Server-side code
│   ├── server.js       # Express server
│   ├── package.json    # Node.js dependencies
│   ├── nginx.conf      # Nginx configuration
│   ├── 2fa-iframe.service # systemd service file
│   └── deploy.sh       # Deployment script
└── README.md           # This file
```

## Installation

See the `instruction.md` file for detailed setup and deployment instructions.

## License

MIT