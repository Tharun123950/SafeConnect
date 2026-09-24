import sqlite3
conn = sqlite3.connect('prisma/dev.db')
cursor = conn.cursor()
cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = [row[0] for row in cursor.fetchall()]
with open('tables_out.txt', 'w') as f:
    f.write(str(tables))
conn.close()
print("Done")
