# TonVera - Premium TON Staking Platform

TonVera is a complete Telegram Mini App for premium TON staking with custodial wallet management, automated rewards, and referral system.

## Features

✨ **Custodial Staking** - Users deposit directly to admin wallet for automated pooled staking  
💰 **Automated Rewards** - Daily reward distribution with 12% admin commission  
🤝 **Referral System** - 10% earnings from referred users' daily rewards  
🔥 **Firebase Integration** - Automatic user data and transaction storage  
⚡ **Instant Withdrawals** - Direct withdrawals from admin wallet liquidity  
📱 **Telegram Mini App** - Seamless mobile experience within Telegram  

## Quick Deployment

### 1. Frontend (GitHub Pages)

1. Fork this repository
2. Go to Settings → Pages → Source: GitHub Actions
3. The frontend will auto-deploy to: `https://yourusername.github.io/tonvera`
4. Copy this URL to connect to your Telegram bot

### 2. Backend (Render/Heroku)

**For Render:**
1. Connect your GitHub repository
2. Select "Web Service"
3. Build Command: `npm run build:server`
4. Start Command: `npm start`

**For Heroku:**
1. Connect repository or use Heroku CLI
2. Set buildpacks to Node.js
3. Deploy from main branch

### 3. Environment Variables

Set these environment variables in your hosting platform:

#### Required Variables

```bash
# Admin Wallet (Required)
ADMIN_WALLET_MNEMONIC="your 24-word mnemonic phrase here"

# Firebase Service Account (Required)
FIREBASE_SERVICE_ACCOUNT_KEY='{
  "type": "service_account",
  "project_id": "tonvera-e8bbb",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-...@tonvera-e8bbb.iam.gserviceaccount.com",
  "client_id": "...",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token"
}'
```

#### Optional Variables

```bash
# TON API (Optional - for enhanced features)
TONCENTER_API_KEY="your-toncenter-api-key"

# Development (Optional)
NODE_ENV="production"
PORT="5000"
```

### 4. Connect to Telegram

1. Create a new bot with [@BotFather](https://t.me/botfather)
2. Get your bot token
3. Set the Mini App URL to your GitHub Pages URL
4. Enable inline mode and web app features

## Environment Variable Details

### ADMIN_WALLET_MNEMONIC
- **What**: 24-word seed phrase for the admin wallet
- **How to get**: Create a TON wallet in Tonkeeper and export the seed phrase
- **Important**: This wallet controls all staking operations and receives commissions


### FIREBASE_SERVICE_ACCOUNT_KEY
- **What**: Service account credentials for Firebase Admin SDK
- **How to get**: 
  1. Go to [Firebase Console](https://console.firebase.google.com)
  2. Select your project → Settings → Service Accounts
  3. Generate new private key
  4. Copy the entire JSON content

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## Architecture

- **Frontend**: React + Vite (deployable to GitHub Pages)
- **Backend**: Express.js API (deployable to Render/Heroku)  
- **Database**: Firebase Firestore (automatic user/transaction storage)
- **Blockchain**: Direct custodial staking through admin wallet
- **Auth**: Telegram WebApp authentication

## Security

🔒 **Admin wallet mnemonic is encrypted and never exposed**  
🔒 **Custodial system handles all staking operations securely**  
🔒 **Firebase provides secure user data storage**  
🔒 **12% commission is automatically calculated server-side**

## Support

For issues or questions:
- Check the [Issues](../../issues) page
- Review the deployment logs
- Ensure all environment variables are correctly set

---

**Ready to stake? Deploy TonVera and start earning TON rewards! 🚀**