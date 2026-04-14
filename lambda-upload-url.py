import json
import boto3
import uuid

s3 = boto3.client("s3")

BUCKET_NAME = "interview-bot-uploads"
REGION = "ap-south-1"

CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Allow-Methods": "GET,POST,PUT,OPTIONS"
}

def lambda_handler(event, context):
    method = event.get("httpMethod", "")
    
    # Handle OPTIONS preflight
    if method == "OPTIONS":
        return {
            "statusCode": 200,
            "headers": CORS_HEADERS,
            "body": ""
        }
    
    # Safe parameter extraction
    try:
        params = event.get("queryStringParameters") or {}
        file_name = params.get("fileName", "")
        file_type = params.get("fileType", "")
        
        if not file_name or not file_type:
            return {
                "statusCode": 400,
                "headers": CORS_HEADERS,
                "body": json.dumps({"error": "Missing fileName or fileType"})
            }
    except Exception:
        return {
            "statusCode": 400,
            "headers": CORS_HEADERS,
            "body": json.dumps({"error": "Invalid parameters"})
        }

    unique_key = f"{uuid.uuid4()}_{file_name}"

    try:
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
            "headers": CORS_HEADERS,
            "body": json.dumps({"error": str(e)})
        }

    public_url = f"https://{BUCKET_NAME}.s3.{REGION}.amazonaws.com/{unique_key}"

    return {
        "statusCode": 200,
        "headers": CORS_HEADERS,
        "body": json.dumps({
            "uploadUrl": url,
            "fileUrl": public_url
        })
    }
