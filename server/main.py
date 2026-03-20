from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
import anthropic
import os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="True Care Cost API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

SYSTEM_PROMPT = """You are MedAssist, a knowledgeable and compassionate AI assistant specialized exclusively in the US medical field. 

Your expertise covers:
- Medical conditions, symptoms, diagnoses, and treatments
- US healthcare system (insurance, Medicare, Medicaid, ACA)
- Medications, drug interactions, and dosage guidance
- Medical procedures and surgeries
- Preventive care and wellness
- Medical terminology and explanations
- Finding the right type of specialist for conditions
- Understanding lab results and medical reports
- Emergency symptoms and when to seek care
- Mental health topics and resources
- Nutrition and lifestyle as they relate to health

CRITICAL RULES:
1. You ONLY answer questions related to the US medical field and healthcare. 
2. If someone asks about anything unrelated to medicine or US healthcare, politely decline and redirect them to medical topics.
3. Always remind users that your information is educational and not a substitute for professional medical advice.
4. For emergencies, always direct users to call 911 or go to the nearest ER.
5. Be empathetic, clear, and use plain language while still being medically accurate.
6. When answering follow-up questions, maintain context from the conversation history to give coherent, connected responses.
7. Never diagnose definitively — always recommend consulting a healthcare provider for diagnosis and treatment decisions.

If asked about non-medical topics, say: "I'm True care Assistant, specialized in US medical and healthcare topics. I can't help with that, but I'm happy to answer any medical questions you have!"
"""

class Message(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: List[Message]

class ChatResponse(BaseModel):
    response: str


@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    try:
        messages = [{"role": m.role, "content": m.content} for m in request.messages]

        response = client.messages.create(
            model="claude-3-haiku-20240307",
            max_tokens=512,
            system=SYSTEM_PROMPT,
            messages=messages,
        )

        return ChatResponse(response=response.content[0].text)

    except anthropic.APIError as e:
        raise HTTPException(status_code=500, detail=f"Anthropic API error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/health")
async def health():
    return {"status": "ok", "service": "MedChat API"}
