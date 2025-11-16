# S3 CORS Configuration for Video Playback

## Issue
Video preview not loading in admin panel (black screen) even though video exists in S3.

## Current Video
- **URL:** `https://urbanesta-realtors.s3.ap-south-1.amazonaws.com/home-videos/1762857646453-WhatsApp_Video_2025-11-11_at_09.09.45.mp4`
- **Bucket:** `urbanesta-realtors`
- **Region:** `ap-south-1`

## Solution: Add CORS Configuration to S3 Bucket

### Steps to Fix:

1. **Go to AWS S3 Console:**
   - Navigate to: https://s3.console.aws.amazon.com/s3/buckets/urbanesta-realtors
   - Select the `urbanesta-realtors` bucket

2. **Go to Permissions Tab:**
   - Click on "Permissions" tab
   - Scroll down to "Cross-origin resource sharing (CORS)"
   - Click "Edit"

3. **Add This CORS Configuration:**

```json
[
    {
        "AllowedHeaders": [
            "*"
        ],
        "AllowedMethods": [
            "GET",
            "HEAD"
        ],
        "AllowedOrigins": [
            "http://localhost:3000",
            "https://admin.urbanesta.in"
        ],
        "ExposeHeaders": [
            "ETag",
            "Content-Length",
            "Content-Type",
            "Accept-Ranges",
            "Content-Range"
        ],
        "MaxAgeSeconds": 3000
    }
]
```

4. **Save Changes**

5. **Verify Bucket Policy (Optional):**
   - Go to "Bucket Policy" section
   - Ensure objects are publicly readable OR accessible with proper CORS

## Alternative: Make Objects Public (Simpler)

If you want videos to be publicly accessible:

1. **Go to Permissions Tab**
2. **Edit Block Public Access:**
   - Uncheck "Block all public access" (if needed)
   - Save

3. **Add Bucket Policy:**

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PublicReadGetObject",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::urbanesta-realtors/home-videos/*"
        }
    ]
}
```

## Test After Configuration

1. Refresh admin panel
2. Click "Update Video" button
3. Video should now load and play
4. Check browser console for any errors

## Video Element Features Added

✅ Shows video URL in alert
✅ Added `crossOrigin="anonymous"` attribute
✅ Added `preload="metadata"`
✅ Added error handlers with console logs
✅ Shows error message if video fails to load

## Current Debugging Output

The modal now shows:
- Video URL in the info alert
- Console error logs if video fails
- Error popup if video can't load

Check browser console (F12) for detailed error messages!

