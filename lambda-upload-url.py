import json
import boto3
import uuid

s3 = boto3.client("s3")

BUCKET_NAME = "interview-bot-uploads"
REGION = "ap-south-1"

def lambda_handler(event, context):
    method = event.get("httpMethod", "")
    
    # Handle CORS preflight
    if method == "OPTIONS":
        return {
            "statusCode": 200,
            "headers": {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "Content-Type,Authorization,Accept",
                "Access-Control-Allow-Methods": "GET,POST,PUT,OPTIONS",
                "Access-Control-Max-Age": "3600"
            },
            "body": ""
        }
    
    # Get parameters
    try:
        params = event.get("queryStringParameters") or {}
        file_name = params.get("fileName", "")
        file_type = params.get("fileType", "")
    except Exception:
        return {
            "statusCode": 400,
            "headers": {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "Content-Type,Authorization,Accept"
            },
            "body": json.dumps({"error": "Invalid parameters"})
        }

    if not file_name or not file_type:
        return {
            "statusCode": 400,
            "headers": {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "Content-Type,Authorization,Accept"
            },
            "body": json.dumps({"error": "Missing fileName or fileType"})
        }

    unique_key = f"{uuid.uuid4()}_{file_name}"

    try:
        # Generate pre-signed URL with proper CORS headers
        url = s3.generate_presigned_url(
            "put_object",
            Params={
                "Bucket": BUCKET_NAME,
                "Key": unique_key,
                "ContentType": file_type
            },
            ExpiresIn=600
        )
    except Exception as e:
        return {
            "statusCode": 500,
            "headers": {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "Content-Type,Authorization,Accept"
            },
            "body": json.dumps({"error": str(e)})
        }

    public_url = f"https://{BUCKET_NAME}.s3.{REGION}.amazonaws.com/{unique_key}"

    return {
        "statusCode": 200,
        "headers": {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Content-Type,Authorization,Accept",
            "Access-Control-Allow-Methods": "GET,POST,PUT,OPTIONS",
            "Access-Control-Max-Age": "3600"
        },
        "body": json.dumps({
            "uploadUrl": url,
            "fileUrl": public_url
        })
    }
