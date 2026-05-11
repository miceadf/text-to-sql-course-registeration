from .rag import retrieve_schema

def build_prompt(user_query):
    relevant = retrieve_schema(user_query)

    return f"""
You are a strict SQL generator.

Relevant schema:
{relevant}

Full schema:
student(student_id, dept_code, grade)
department(dept_code, dept_name)
subject(subject_code, subject_name, category, credit_hours)
course_offerings(course_year, subject_code, section, capacity, enrolled, lecture_time, professor, grading_method, eval_type, dept_code, class_mode)

Rules:
- ONLY SELECT
- No guessing columns
- If unclear → UNKNOWN

User: {user_query}
SQL:
"""
