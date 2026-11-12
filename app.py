
import os
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="HH Healing Hearts AI")

class CaptionRequest(BaseModel):
    topic: str
    platform: str = "Facebook and Instagram"

@app.get("/")
def home():
    return {
        "organization": "HH Healing Hearts Inc.",
        "message": "HH AI is running!"
    }

@app.get("/health")
def health():
    return {"status": "healthy"}

@app.post("/generate-caption")
def generate_caption(request: CaptionRequest):
    api_key = os.getenv("OPENAI_API_KEY")

    if not api_key:
        raise HTTPException(
            status_code=500,
            detail="OpenAI API key is not configured."
        )

    client = OpenAI(api_key=api_key)

    response = client.responses.create(
       model="gpt-5.5",
        input=f"""
        You are the social media manager for HH Healing Hearts Inc.

        Mission: Support families in crisis, including people
        with disabilities.

        Tagline: Touching Hearts. Transforming Lives. Restoring Hope.

        Create an engaging, compassionate social media caption
        about: {request.topic}

        Platform: {request.platform}

        Include relevant hashtags.
        """
    )

    return {"caption": response.output_text}
