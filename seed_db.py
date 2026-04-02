from db import get_db_connection

def seed_full_syllabus():
    conn = get_db_connection()
    if not conn:
        return
    cursor = conn.cursor()

    # Drop and Re-create to ensure schema sync
    cursor.execute("DROP TABLE IF EXISTS syllabus")
    cursor.execute("""
        CREATE TABLE syllabus (
            id INT AUTO_INCREMENT PRIMARY KEY,
            subject VARCHAR(50),
            category VARCHAR(100),
            topic VARCHAR(255),
            status VARCHAR(20) DEFAULT 'pending',
            exam_type VARCHAR(20)
        )
    """)

    syllabus_data = [
        # REASONING (PRELIMS)
        ('Reasoning', 'Easy to Master', 'Syllogism', 'prelims'),
        ('Reasoning', 'Easy to Master', 'Inequality', 'prelims'),
        ('Reasoning', 'Easy to Master', 'Coding-Decoding', 'prelims'),
        ('Reasoning', 'Easy to Master', 'Blood Relations', 'prelims'),
        ('Reasoning', 'Easy to Master', 'Direction Sense', 'prelims'),
        ('Reasoning', 'Easy to Master', 'Order and Ranking', 'prelims'),
        ('Reasoning', 'Complex Topics', 'Puzzles', 'prelims'),
        ('Reasoning', 'Complex Topics', 'Seating Arrangement', 'prelims'),
        ('Reasoning', 'Complex Topics', 'Data Sufficiency', 'prelims'),
        ('Reasoning', 'Complex Topics', 'Input Output', 'prelims'),
        ('Reasoning', 'Complex Topics', 'Logical Reasoning', 'prelims'),

        # ENGLISH (PRELIMS)
        ('English', 'Grammar Based', 'Error Detection', 'prelims'),
        ('English', 'Grammar Based', 'Sentence Improvement', 'prelims'),
        ('English', 'Grammar Based', 'Fill in the Blanks', 'prelims'),
        ('English', 'Grammar Based', 'Sentence Correction', 'prelims'),
        ('English', 'Reading + Grammar + Vocabulary', 'Reading Comprehension', 'prelims'),
        ('English', 'Reading + Grammar + Vocabulary', 'Cloze Test', 'prelims'),
        ('English', 'Reading + Grammar + Vocabulary', 'Para Jumbles', 'prelims'),
        ('English', 'Reading + Grammar + Vocabulary', 'Vocabulary', 'prelims'),

        # QUANT (PRELIMS)
        ('Quant', 'Easy to Master', 'Simplification', 'prelims'),
        ('Quant', 'Easy to Master', 'Approximation', 'prelims'),
        ('Quant', 'Easy to Master', 'Number Series', 'prelims'),
        ('Quant', 'Complex Topics', 'Profit and Loss', 'prelims'),
        ('Quant', 'Complex Topics', 'Time and Work', 'prelims'),
        ('Quant', 'Complex Topics', 'Time Speed Distance', 'prelims'),
        ('Quant', 'Complex Topics', 'Ratio and Proportion', 'prelims'),
        ('Quant', 'Complex Topics', 'Mixtures and Alligations', 'prelims'),
        ('Quant', 'Concept Building', 'Percentages', 'prelims'),
        ('Quant', 'Concept Building', 'Averages', 'prelims'),
        ('Quant', 'Concept Building', 'Simple Interest', 'prelims'),
        ('Quant', 'Concept Building', 'Compound Interest', 'prelims'),

        # MAINS (IT OFFICER)
        ('IT', 'Programming', 'C Programming', 'mains'),
        ('IT', 'Programming', 'Java', 'mains'),
        ('IT', 'Programming', 'Python', 'mains'),
        ('IT', 'Database', 'DBMS Concepts', 'mains'),
        ('IT', 'Database', 'SQL Queries', 'mains'),
        ('IT', 'Database', 'Normalization', 'mains'),
        ('IT', 'Networking', 'OSI Model', 'mains'),
        ('IT', 'Networking', 'TCP/IP', 'mains'),
        ('IT', 'Networking', 'DNS HTTP FTP', 'mains'),
        ('IT', 'Operating Systems', 'Process Management', 'mains'),
        ('IT', 'Operating Systems', 'Memory Management', 'mains'),
        ('IT', 'Operating Systems', 'Deadlocks', 'mains'),
        ('IT', 'Data Structures', 'Arrays', 'mains'),
        ('IT', 'Data Structures', 'Linked List', 'mains'),
        ('IT', 'Data Structures', 'Stacks and Queues', 'mains'),
        ('IT', 'Data Structures', 'Trees and Graphs', 'mains'),
        ('IT', 'Software Engineering', 'SDLC', 'mains'),
        ('IT', 'Software Engineering', 'Agile Model', 'mains'),
        ('IT', 'Security', 'Cryptography', 'mains'),
        ('IT', 'Security', 'Network Security', 'mains'),
        ('IT', 'Web Technologies', 'HTML CSS Basics', 'mains'),
        ('IT', 'Web Technologies', 'APIs and HTTP', 'mains'),

        # MAINS (ADVANCED - NEW)
        ('IT', 'Computer Fundamentals', 'Computer Architecture', 'mains'),
        ('IT', 'Computer Fundamentals', 'Number System', 'mains'),
        ('IT', 'Computer Fundamentals', 'Memory (RAM, ROM, Cache)', 'mains'),
        ('IT', 'Computer Fundamentals', 'Input Output Devices', 'mains'),
        ('IT', 'Networking (Advanced)', 'Subnetting', 'mains'),
        ('IT', 'Networking (Advanced)', 'IP Addressing', 'mains'),
        ('IT', 'Networking (Advanced)', 'Routing Protocols', 'mains'),
        ('IT', 'Networking (Advanced)', 'Network Devices', 'mains'),
        ('IT', 'Security (Advanced)', 'SSL/TLS', 'mains'),
        ('IT', 'Security (Advanced)', 'Firewalls', 'mains'),
        ('IT', 'Security (Advanced)', 'Cyber Attacks', 'mains'),
        ('IT', 'Security (Advanced)', 'Authentication Methods', 'mains'),
        ('IT', 'DBMS (Advanced)', 'Transactions', 'mains'),
        ('IT', 'DBMS (Advanced)', 'ACID Properties', 'mains'),
        ('IT', 'DBMS (Advanced)', 'Indexing', 'mains'),
        ('IT', 'DBMS (Advanced)', 'Joins', 'mains'),
        ('IT', 'Data Structures (Advanced)', 'Sorting Algorithms', 'mains'),
        ('IT', 'Data Structures (Advanced)', 'Searching Algorithms', 'mains'),
        ('IT', 'Data Structures (Advanced)', 'Time Complexity', 'mains'),
        ('IT', 'Software Engineering (Advanced)', 'Software Testing', 'mains'),
        ('IT', 'Software Engineering (Advanced)', 'Design Basics', 'mains'),
        ('IT', 'Other Important', 'Cloud Computing', 'mains'),
        ('IT', 'Other Important', 'Compiler Basics', 'mains'),
        ('IT', 'Other Important', 'Digital Logic', 'mains'),
    ]

    for subject, category, topic, exam_type in syllabus_data:
        cursor.execute("""
            INSERT INTO syllabus (subject, category, topic, status, exam_type)
            VALUES (%s, %s, %s, 'pending', %s)
        """, (subject, category, topic, exam_type))

    conn.commit()
    cursor.close()
    conn.close()
    print("Full IBPS SO syllabus seeded successfully.")

if __name__ == "__main__":
    seed_full_syllabus()
