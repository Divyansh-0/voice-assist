#!/usr/bin/env python
from dotenv import load_dotenv
import os
# Load environment variables from .env file
load_dotenv()

from flask import Flask, request, jsonify, redirect, make_response
from flask_cors import CORS
from langchain_google_genai import ChatGoogleGenerativeAI ,GoogleGenerativeAIEmbeddings
import shutil
from langchain.chains import create_retrieval_chain

from langchain.prompts.chat import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import Chroma

from langchain_community.document_loaders import PyPDFLoader

from deep_translator import GoogleTranslator
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer




os.environ["GOOGLE_API_KEY"] = "AIzaSyAYGRHzsa9_V9AsbrfXXSDj5VRrCnYZaoo"


app = Flask(__name__)
CORS(app)

# Global variable to track document processing status
document_processed = False
vectorstores = {}

def load_vectorstore(file):
    loader = PyPDFLoader(file)
    docs = loader.load()
    text_splitter = RecursiveCharacterTextSplitter.from_tiktoken_encoder(chunk_size=500, chunk_overlap=0)
    doc_splits = text_splitter.split_documents(docs)
    embd = GoogleGenerativeAIEmbeddings(model="models/embedding-001")
    vectorstore = Chroma.from_documents(documents=doc_splits, collection_name="rag-chroma", embedding=embd)
    return vectorstore.as_retriever()

def get_chain():
    template = """You are an AI Insurance Agent working for TrustShield Insurance, a leading company specializing in life, health, and property insurance. Your primary goal is to understand the user's needs, answer their queries, and seamlessly guide the conversation towards recommending relevant insurance products offered by TrustShield.

You have access to the following context, which may include information about the user’s situation, policy options, or specific insurance needs.

If the provided context is not helpful or relevant to the user's query, use your own reasoning and knowledge about TrustShield's products to provide a useful and accurate response. 

Remember:
1. Always focus on how TrustShield's insurance solutions can address the user's concerns or needs.
2. Maintain a professional and helpful tone, emphasizing the benefits of TrustShield's products.
3. Avoid deviating from the topic of insurance or engaging in unrelated discussions.

Use the following context to answer the question:

Context:
{context}

User's Question:
{question}

Your Response:
    """
    prompt = ChatPromptTemplate.from_template(template)
    model = ChatGoogleGenerativeAI(
        model="gemini-1.5-flash",
        temperature=0.6,
        max_tokens=None,
        timeout=None,
        max_retries=2,
    )
    output_parser = StrOutputParser()

    # Create the LLMChain
    llm_chain = prompt | model | output_parser
    return llm_chain


def summarizer(txt):
    template = """Summarize following text in the same language of the origin:
    {txt}
    
    """
    prompt = ChatPromptTemplate.from_template(template)
    model = ChatGoogleGenerativeAI(
        model="gemini-1.5-flash",
        temperature=0.6,
        max_tokens=None,
        timeout=None,
        max_retries=2,
    )
    output_parser = StrOutputParser()

 
    llm_chain = prompt | model | output_parser
    res = llm_chain.invoke({'txt' : txt})
    return res
    


analyzer = SentimentIntensityAnalyzer()

def get_sentiment_tag(sentiment):
    """Determine the sentiment tag based on the sentiment scores."""
    if sentiment['compound'] :
        compound = sentiment['compound']
    
    
        if compound >= 0.05:
            return "Positive"
        elif compound <= -0.05:
            return "Negative"
        else:
            return "Neutral"
    else:
        return max(sentiment['neg'] , sentiment['neu'] , sentiment['pos'])


@app.route('/submit_chat', methods=['POST'])
def submit_chat():
    data = request.json
    user_id = data.get("user_id")
    chat_history = data.get("chat_history", [])

    if not user_id or not chat_history:
        return jsonify({"error": "User ID and chat history are required"}), 400

    # Separate user and AI messages
    user_text = " ".join([msg['message'] for msg in chat_history if msg['sender'] == 'user'])
    ai_text = " ".join([msg['message'] for msg in chat_history if msg['sender'] == 'ai'])

    # Summarize both user and AI messages
    user_summary = summarizer(user_text)
    ai_summary = summarizer(ai_text)

    user_summary = GoogleTranslator(source='auto', target='en').translate(user_summary)
    ai_summary = GoogleTranslator(source='auto', target='en').translate(ai_summary)

    # Perform sentiment analysis on both user and AI summaries
    user_sentiment = analyzer.polarity_scores(user_summary)
    ai_sentiment = analyzer.polarity_scores(ai_summary)

    user_sentiment_tag = get_sentiment_tag(user_sentiment)
    ai_sentiment_tag = get_sentiment_tag(ai_sentiment)

    # Prepare the response
    response = {
        "user_summary": user_summary,
        "user_sentiment": user_sentiment_tag,  # Send only the sentiment tag
        "ai_summary": ai_summary,
        "ai_sentiment": ai_sentiment_tag  # Send only the sentiment tag
    }

    print(response)
    return jsonify(response)

# Route to handle document upload
@app.route("/upload", methods=["POST"])
def upload_document():
    global document_processed
    file = request.files["file"]

    # Save the uploaded file to disk
    filename = file.filename
    with open(filename, "wb") as buffer:
        shutil.copyfileobj(file.stream, buffer)

    # Load vectorstore and process the document
    retriever = load_vectorstore(filename)
    vectorstores[filename] = retriever
    document_processed = True

    return jsonify({"filename": filename, "message": "Document processed successfully."})

# Route to handle retrieval-augmented generation (RAG)
@app.route("/rag", methods=["POST"])
def rag_endpoint():
    question = request.json.get("question")
    filename = request.json.get("filename")

    if not document_processed:
        return jsonify({"error": "Please upload a document first."}), 403

    retriever = vectorstores[filename]
    chain = get_chain()

    # Print the retrieved context
    retrieved_docs = retriever.get_relevant_documents(question)
 

    result = chain.invoke({"question": question , "context" : retrieved_docs})

    return jsonify({"response": result})

# Redirect root to docs
@app.route("/")
def redirect_root_to_docs():
    return redirect("/docs")

# Run the server
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000)