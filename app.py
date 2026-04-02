from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from db import get_db_connection, init_db
import os
from datetime import date

app = Flask(__name__, static_folder=os.getcwd(), static_url_path='')
CORS(app)

# Initialize database on startup
init_db()

def success_response(message="Done", data=None):
    resp = {"status": "success", "message": message}
    if data is not None:
        resp["data"] = data
    return jsonify(resp)

def error_response(message="Error", code=400):
    return jsonify({"status": "error", "message": message}), code

# --- Frontend Serving ---
@app.route('/')
def serve_index():
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory(app.static_folder, path)

# --- Syllabus API ---
@app.route('/api/syllabus', methods=['GET'])
def get_syllabus():
    exam_type = request.args.get('exam_type')
    subject = request.args.get('subject')
    status = request.args.get('status')
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    query = "SELECT * FROM syllabus WHERE 1=1"
    params = []
    if exam_type:
        query += " AND exam_type = %s"
        params.append(exam_type)
    if subject:
        query += " AND subject = %s"
        params.append(subject)
    if status:
        query += " AND status = %s"
        params.append(status)
    cursor.execute(query, params)
    data = cursor.fetchall()
    cursor.close()
    conn.close()
    return success_response("Syllabus fetched", data)

@app.route('/api/add_syllabus', methods=['POST'])
def add_syllabus_v2():
    data = request.json
    if not data or not data.get('topic') or not data.get('subject'):
        return error_response("Missing required fields (topic, subject)")
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO syllabus (subject, category, topic, status, exam_type)
        VALUES (%s, %s, %s, %s, %s)
    """, (data['subject'], data.get('category', 'General'), data['topic'], data.get('status', 'pending'), data.get('exam_type', 'prelims')))
    conn.commit()
    cursor.close()
    conn.close()
    return success_response("Syllabus topic added")

@app.route('/api/syllabus/<int:topic_id>', methods=['PUT', 'DELETE'])
def manage_syllabus(topic_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    if request.method == 'DELETE':
        cursor.execute("DELETE FROM syllabus WHERE id = %s", (topic_id,))
        conn.commit()
        return success_response("Topic deleted")
    data = request.json
    fields = []
    values = []
    for k, v in data.items():
        if k in ['status', 'topic', 'category', 'subject', 'exam_type']:
            fields.append(f"{k} = %s")
            values.append(v)
    if not fields: return error_response("No valid fields to update")
    values.append(topic_id)
    query = f"UPDATE syllabus SET {', '.join(fields)} WHERE id = %s"
    cursor.execute(query, values)
    conn.commit()
    cursor.close()
    conn.close()
    return success_response("Topic updated")

# --- Tasks API ---
@app.route('/api/tasks', methods=['GET', 'POST'])
def tasks_api():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    if request.method == 'POST':
        data = request.json
        cursor.execute("""
            INSERT INTO tasks (task_name, subject, status, date, priority, is_carried_forward)
            VALUES (%s, %s, %s, %s, %s, %s)
        """, (data['task_name'], data.get('subject', 'General'), data.get('status', 'Pending'), data.get('date', date.today().isoformat()), data.get('priority', 'Medium'), data.get('is_carried_forward', False)))
        conn.commit()
        return success_response("Task added")
    else:
        target_today = date.today().isoformat()
        cursor.execute("""
            SELECT * FROM tasks 
            WHERE status = 'Pending' 
            OR (status = 'Completed' AND date = %s)
            ORDER BY priority DESC, date ASC
        """, (target_today,))
        data = cursor.fetchall()
        return success_response("Tasks synchronized", data)

@app.route('/api/tasks/<int:task_id>', methods=['PUT', 'DELETE'])
def manage_task(task_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    if request.method == 'DELETE':
        cursor.execute("DELETE FROM tasks WHERE id = %s", (task_id,))
        conn.commit()
        return success_response("Task deleted")
    data = request.json
    fields = []
    values = []
    for k, v in data.items():
        fields.append(f"{k} = %s")
        values.append(v)
    values.append(task_id)
    query = f"UPDATE tasks SET {', '.join(fields)} WHERE id = %s"
    cursor.execute(query, values)
    conn.commit()
    cursor.close()
    conn.close()
    return success_response("Task updated")

# --- Resources API ---
@app.route('/api/resources', methods=['GET', 'POST'])
def resources_api():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    if request.method == 'POST':
        data = request.json
        cursor.execute("INSERT INTO resources (subject, date, youtube_link, pdf_path) VALUES (%s, %s, %s, %s)", 
                       (data['subject'], date.today().isoformat(), data.get('youtube_link'), data.get('pdf_path')))
        conn.commit()
        return success_response("Resource added")
    else:
        cursor.execute("SELECT * FROM resources ORDER BY id DESC")
        data = cursor.fetchall()
        return success_response("Resources fetched", data)

@app.route('/api/resources/<int:id>', methods=['DELETE'])
def delete_resource(id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM resources WHERE id = %s", (id,))
    conn.commit()
    cursor.close()
    conn.close()
    return success_response("Resource deleted")

# --- Study Logs & Session Timer API ---
@app.route('/api/study_logs', methods=['GET', 'POST'])
def study_logs():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    if request.method == 'POST':
        data = request.json
        cursor.execute("SELECT id, hours FROM study_logs WHERE subject = %s AND date = %s", (data['subject'], data['date']))
        existing = cursor.fetchone()
        if existing:
            new_hours = float(existing['hours']) + float(data['hours'])
            cursor.execute("UPDATE study_logs SET hours = %s WHERE id = %s", (new_hours, existing['id']))
        else:
            cursor.execute("INSERT INTO study_logs (subject, hours, date) VALUES (%s, %s, %s)", (data['subject'], data['hours'], data['date']))
        conn.commit()
        return success_response("Study hours saved")
    else:
        cursor.execute("SELECT * FROM study_logs ORDER BY date DESC")
        data = cursor.fetchall()
        return success_response("Logs fetched", data)

# --- Timetable API ---
@app.route('/api/timetable', methods=['GET', 'POST', 'PUT'])
def timetable_api():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    if request.method == 'PUT':
        data = request.json
        cursor.execute("SELECT id FROM timetable WHERE time_slot = %s AND day_of_week = %s", (data['time_slot'], data['day_of_week']))
        existing = cursor.fetchone()
        if existing:
            cursor.execute("UPDATE timetable SET subject = %s, topic = %s WHERE id = %s", (data['subject'], data.get('topic', ''), existing['id']))
        else:
            cursor.execute("INSERT INTO timetable (time_slot, day_of_week, subject, topic) VALUES (%s, %s, %s, %s)", 
                           (data['time_slot'], data['day_of_week'], data['subject'], data.get('topic', '')))
        conn.commit()
        return success_response("Timetable updated")
    else:
        cursor.execute("SELECT * FROM timetable")
        data = cursor.fetchall()
        return success_response("Timetable fetched", data)

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    app.run(debug=True, host='0.0.0.0', port=port)
