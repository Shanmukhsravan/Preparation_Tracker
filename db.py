import mysql.connector
from mysql.connector import errorcode
import os
from dotenv import load_dotenv

load_dotenv()

DB_CONFIG = {
    'user': 'root',
    'password': '123456789',
    'host': '127.0.0.1',
    'database': 'preparationTracker',
}

def get_db_connection(create_db=False):
    try:
        if create_db:
            # Connect without database to create it
            temp_config = DB_CONFIG.copy()
            del temp_config['database']
            conn = mysql.connector.connect(**temp_config)
            cursor = conn.cursor()
            cursor.execute(f"CREATE DATABASE IF NOT EXISTS {DB_CONFIG['database']}")
            cursor.close()
            conn.close()

        conn = mysql.connector.connect(**DB_CONFIG)
        return conn
    except mysql.connector.Error as err:
        print(f"Error: {err}")
        return None

def init_db():
    conn = get_db_connection(create_db=True)
    if not conn:
        return

    cursor = conn.cursor()

    # Syllabus table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS syllabus (
            id INT AUTO_INCREMENT PRIMARY KEY,
            subject VARCHAR(50),
            category VARCHAR(100),
            topic VARCHAR(255),
            status VARCHAR(20) DEFAULT 'pending',
            exam_type VARCHAR(20)
        )
    """)

    # Tasks table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS tasks (
            id INT AUTO_INCREMENT PRIMARY KEY,
            task_name VARCHAR(255) NOT NULL,
            subject VARCHAR(50) NOT NULL,
            status ENUM('Pending', 'Completed') DEFAULT 'Pending',
            date DATE NOT NULL,
            priority ENUM('High', 'Medium', 'Low') DEFAULT 'Medium',
            is_carried_forward BOOLEAN DEFAULT FALSE
        )
    """)

    # Study Logs table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS study_logs (
            id INT AUTO_INCREMENT PRIMARY KEY,
            subject VARCHAR(50) NOT NULL,
            hours DECIMAL(4, 2) NOT NULL,
            date DATE NOT NULL
        )
    """)

    # Mock Tests table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS mock_tests (
            id INT AUTO_INCREMENT PRIMARY KEY,
            exam_name VARCHAR(255) NOT NULL,
            score DECIMAL(5, 2) NOT NULL,
            accuracy DECIMAL(5, 2) NOT NULL,
            weak_areas TEXT,
            date DATE NOT NULL
        )
    """)

    # Resources table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS resources (
            id INT AUTO_INCREMENT PRIMARY KEY,
            subject VARCHAR(50) NOT NULL,
            date DATE NOT NULL,
            youtube_link VARCHAR(500),
            pdf_path VARCHAR(500)
        )
    """)

    # Timetable table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS timetable (
            id INT AUTO_INCREMENT PRIMARY KEY,
            time_slot VARCHAR(100) NOT NULL,
            subject VARCHAR(50) NOT NULL,
            topic VARCHAR(255),
            day_of_week VARCHAR(20) NOT NULL
        )
    """)

    conn.commit()
    cursor.close()
    conn.close()
    print("Database and tables initialized successfully.")

if __name__ == "__main__":
    init_db()
