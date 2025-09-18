# In-App Purchase (Tip Jar) Setup Guide

## Overview
Your app now includes a beautiful Tip Jar feature with In-App Purchases! Users can support your development with $1, $5, or $10 tips.

## Features Implemented
✅ **Tip Jar UI**: Beautiful dialog with emoji-based tip options
✅ **Support Button**: ❤️ Support button in the toolbar
✅ **In-App Purchase Logic**: Complete purchase handling
✅ **Thank You Messages**: User feedback for successful purchases
✅ **Error Handling**: Graceful error handling for failed purchases

## App Store Connect Setup

### 1. Create In-App Purchase Products
1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Select your app: "Text to PDF"
3. Go to **Features** → **In-App Purchases**
4. Click **+** to create new products

### 2. Create Three Non-Consumable Products

#### Product 1: Coffee Tip
- **Product ID**: `com.khamrozabdukhoshimov.txttopdf.tip.coffee`
- **Type**: Non-Consumable
- **Reference Name**: Coffee Tip
- **Price**: $1.00
- **Display Name**: Buy me a coffee
- **Description**: Support the developer with a coffee ☕

#### Product 2: Lunch Tip
- **Product ID**: `com.khamrozabdukhoshimov.txttopdf.tip.lunch`
- **Type**: Non-Consumable
- **Reference Name**: Lunch Tip
- **Price**: $5.00
- **Display Name**: Buy me lunch
- **Description**: Support the developer with lunch 🍕

#### Product 3: Support Tip
- **Product ID**: `com.khamrozabdukhoshimov.txttopdf.tip.support`
- **Type**: Non-Consumable
- **Reference Name**: Support Tip
- **Price**: $10.00
- **Display Name**: Support future updates
- **Description**: Support future development 🚀

### 3. App Store Review Information
For each product, add:
- **Review Screenshot**: Screenshot of the Tip Jar dialog
- **Review Notes**: "This is a donation/tip feature. No additional functionality is unlocked. Users can support the developer with optional tips."

## Code Configuration

### 1. Update Product IDs (if needed)
Edit `iap-config.js` to match your exact product IDs from App Store Connect.

### 2. Set Apple Shared Secret (Production)
For production builds, set the Apple Shared Secret:
```bash
export APPLE_SHARED_SECRET="your_shared_secret_here"
```

### 3. Test with Sandbox
For testing, the app automatically uses sandbox product IDs when `NODE_ENV=development`.

## Testing In-App Purchases

### 1. Sandbox Testing
1. Create a sandbox test user in App Store Connect
2. Sign out of App Store on your Mac
3. Run the app in development mode
4. Test purchases with sandbox account

### 2. Test Commands
```bash
# Development build (uses sandbox)
npm run dist:mas-dev

# Production build (uses real products)
npm run dist:mas
```

## UI Features

### Support Button
- **Location**: Toolbar (next to color picker)
- **Style**: Red gradient with heart emoji
- **Hover Effect**: Lifts up with shadow

### Tip Jar Dialog
- **Design**: Dark theme matching app
- **Options**: Three tip amounts with emojis
- **Feedback**: Loading states, success/error messages
- **Thank You**: Toast notification after successful purchase

### Tip Options
- ☕ **$1 - Buy me a coffee**
- 🍕 **$5 - Buy me lunch**  
- 🚀 **$10 - Support future updates**

## App Store Guidelines Compliance

### ✅ Compliant Features
- **Clear Labeling**: "Support this project" - not misleading
- **No Feature Gating**: Tips don't unlock features
- **Transparent**: Users know it's a donation
- **Optional**: No pressure to purchase

### ✅ Best Practices
- **Non-Intrusive**: Support button is visible but not pushy
- **Clear Value**: Users understand what they're supporting
- **Good UX**: Smooth purchase flow with feedback
- **Appropriate Pricing**: Reasonable tip amounts

## Revenue Potential

### Typical Tip Jar Performance
- **Conversion Rate**: 2-5% of users tip
- **Average Tip**: $3-5 per tipper
- **Monthly Revenue**: $50-500 (depending on user base)

### Tips to Increase Tips
1. **Show Appreciation**: Thank users for tips
2. **Update Regularly**: Active development encourages tips
3. **Be Transparent**: Explain what tips support
4. **Quality App**: Great user experience = more tips

## Troubleshooting

### Common Issues
1. **Products Not Loading**: Check product IDs match App Store Connect
2. **Purchase Fails**: Verify sandbox testing setup
3. **Receipt Validation**: Check Apple Shared Secret
4. **UI Not Showing**: Ensure all files are included in build

### Debug Commands
```bash
# Check if IAP is working
console.log(await window.api.iapGetProducts());

# Test purchase
console.log(await window.api.iapPurchase('tip_coffee'));
```

## Next Steps

1. **Set up products in App Store Connect**
2. **Test with sandbox account**
3. **Submit app for review with IAP**
4. **Monitor sales in App Store Connect**

Your Tip Jar is ready to help support your app development! 🚀
