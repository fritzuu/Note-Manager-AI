from fastapi import FastAPI, HTTPException
from profile_contract import StudentAssessment
from predict import predict_student_performance

app = FastAPI(title="Cogniva Learning Profile", version="2.0.0")

@app.get("/")
def read_root():
    return {"message": "Learning profile service", "schemaVersion": 2}

@app.post("/predict")
def predict(student: StudentAssessment):
    try:
        return predict_student_performance(student.dict())
    except Exception as error:
        # Never report artifact failures as a successful prediction.
        raise HTTPException(status_code=503, detail="Model result unavailable") from error
