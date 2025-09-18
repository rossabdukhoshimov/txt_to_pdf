# Mac App Store Publishing Guide

## Prerequisites

### 1. Apple Developer Account
- Sign up at [developer.apple.com](https://developer.apple.com)
- Enroll in the Apple Developer Program ($99/year)
- This gives you access to App Store Connect and code signing certificates

### 2. App Store Connect Setup
- Go to [App Store Connect](https://appstoreconnect.apple.com)
- Create a new app with the bundle ID: `com.khamrozabdukhoshimov.txttopdf`
- Fill in app information, description, keywords, etc.

## Required Assets

### 1. App Icon
You need to create an app icon with these sizes:
- 16x16, 32x32, 64x64, 128x128, 256x256, 512x512, 1024x1024 pixels
- Save as `.icns` format for macOS
- Place in `assets/icon.icns`

**Tools to create .icns:**
- Use [Icon Composer](https://developer.apple.com/design/human-interface-guidelines/macos/icons-and-images/app-icon/) (free from Apple)
- Or online tools like [iconverticons.com](https://iconverticons.com/online/)

### 2. App Store Screenshots
- Required: 1280x800, 2560x1600, 2880x1800 pixels
- Show your app in action
- At least 3 screenshots recommended

### 3. App Store Metadata
- App name: "Text to PDF"
- Subtitle: "Simple text editor with PDF export"
- Description: (write compelling description)
- Keywords: text, pdf, editor, document, writer
- Category: Productivity
- Age rating: 4+ (suitable for all ages)

## Code Signing Setup

### 1. Create Certificates
In Xcode or Keychain Access:
1. Create "Mac App Store" certificate
2. Create "Mac Installer Distribution" certificate
3. Download and install both certificates

### 2. Create Provisioning Profile
1. Go to [developer.apple.com](https://developer.apple.com)
2. Create a new Mac App Store provisioning profile
3. Use bundle ID: `com.khamrozabdukhoshimov.txttopdf`
4. Download and install the profile

## Building for App Store

### 1. Test Build (No Code Signing)
```bash
npm run dist:mas-dev
```
This creates an unsigned build for testing.

### 2. Production Build (Code Signed)
```bash
npm run dist:mas
```
This creates a signed build ready for App Store submission.

## Submission Process

### 1. Upload to App Store Connect
1. Use Xcode or Application Loader to upload your `.pkg` file
2. Or use `electron-builder` with auto-upload:
   ```bash
   npm run dist:mas -- --publish always
   ```

### 2. App Store Connect Configuration
1. Set up app information
2. Upload screenshots
3. Set pricing and availability
4. Submit for review

## Important Notes

### Sandboxing Requirements
Your app is configured with App Store sandboxing:
- ✅ File access (user-selected files only)
- ✅ Network access (for updates)
- ✅ Print access (for PDF generation)

### App Store Guidelines
- Follow [Mac App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- Ensure your app works without internet (except for updates)
- Test on different macOS versions
- No private APIs or restricted functionality

### Testing
- Test on macOS 11.0+ (Big Sur and later)
- Test on both Intel and Apple Silicon Macs
- Test all file formats (txt, md, html, pdf, docx)
- Test PDF export functionality

## Troubleshooting

### Common Issues
1. **Code signing errors**: Ensure certificates are properly installed
2. **Sandbox violations**: Check entitlements file
3. **Upload failures**: Verify bundle ID matches App Store Connect
4. **Rejection reasons**: Address all feedback from Apple

### Useful Commands
```bash
# Check code signing
codesign -dv --verbose=4 dist/mas/Text\ to\ PDF.app

# Verify entitlements
codesign -d --entitlements - dist/mas/Text\ to\ PDF.app

# Test build locally
npm run dist:mas-dev
```

## Timeline
- App Store review: 1-7 days typically
- First submission might take longer
- Plan for potential rejections and fixes

Good luck with your App Store submission! 🚀
