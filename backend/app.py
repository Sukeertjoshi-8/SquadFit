import sqlite3
import random
import string
import math
from datetime import datetime
from flask import Flask, request, jsonify
from flask_cors import CORS
import cloudinary
import cloudinary.uploader

import os
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
# Enable CORS for all routes so the mobile/Capacitor frontend can communicate without being blocked
CORS(app)

base_dir = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(base_dir, 'squads.db')

# Cloudinary CDN Configuration
cloudinary.config(
    cloud_name=os.environ.get('CLOUDINARY_CLOUD_NAME'),
    api_key=os.environ.get('CLOUDINARY_API_KEY'),
    api_secret=os.environ.get('CLOUDINARY_API_SECRET')
)

@app.route('/api/profile', methods=['GET'])
def get_profile():
    username = request.args.get('username')
    if not username:
        return jsonify({'error': 'Username missing'}), 400

    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        c = conn.cursor()
        c.execute('SELECT * FROM profiles WHERE username = ?', (username,))
        row = c.fetchone()
        conn.close()

        if not row:
            return jsonify({'error': 'Profile not found'}), 404

        return jsonify({'success': True, 'profile': dict(row)}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/profile', methods=['POST'])
def update_profile():
    data = request.json
    username = data.get('username')
    name = data.get('name', '')
    age = data.get('age')
    gender = data.get('gender', '')
    height = data.get('height')
    start_w = data.get('start_weight', 80)
    curr_w = data.get('current_weight')
    target_w = data.get('target_weight')
    goal_date = data.get('goal_date', '')
    frequency = data.get('frequency', 3)
    squad_id = data.get('squad_id', '')
    gym_type = data.get('gym_type', '')
    primary_goal = data.get('primary_goal', '')
    can_pullup = data.get('can_pullup', 0)
    can_dip = data.get('can_dip', 0)
    can_pushup = data.get('can_pushup', 0)
    can_barbell_press = data.get('can_barbell_press', 0)
    
    import json
    schedule_raw = data.get('schedule', [])
    schedule = json.dumps(schedule_raw) if isinstance(schedule_raw, list) else schedule_raw
    
    equipment_raw = data.get('equipment', [])
    equipment = json.dumps(equipment_raw) if isinstance(equipment_raw, list) else equipment_raw
    
    if not username: return jsonify({'error': 'Username missing'}), 400
    try:
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        c.execute('''
            INSERT INTO profiles (username, name, age, gender, height, start_weight, current_weight, target_weight, goal_date, frequency, schedule, squad_id, gym_type, primary_goal, equipment, can_pullup, can_dip, can_pushup, can_barbell_press)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(username) DO UPDATE SET
            name=excluded.name,
            age=excluded.age,
            gender=excluded.gender,
            height=excluded.height,
            start_weight=excluded.start_weight,
            current_weight=excluded.current_weight,
            target_weight=excluded.target_weight,
            goal_date=excluded.goal_date,
            frequency=excluded.frequency,
            schedule=excluded.schedule,
            squad_id=excluded.squad_id,
            gym_type=excluded.gym_type,
            primary_goal=excluded.primary_goal,
            equipment=excluded.equipment,
            can_pullup=excluded.can_pullup,
            can_dip=excluded.can_dip,
            can_pushup=excluded.can_pushup,
            can_barbell_press=excluded.can_barbell_press
        ''', (
            username, name, age, gender, height,
            float(start_w) if start_w else None,
            float(curr_w) if curr_w else None,
            float(target_w) if target_w else None,
            goal_date, frequency, schedule, str(squad_id), gym_type, primary_goal,
            equipment, int(can_pullup), int(can_dip), int(can_pushup), int(can_barbell_press)
        ))
        conn.commit()
        conn.close()
        return jsonify({'success': True}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/squads/create', methods=['POST'])
def create_squad():
    data = request.json
    squad_name = data.get('squad_name')
    username = data.get('username')

    if not squad_name or not username:
        return jsonify({'error': 'Missing name or username'}), 400

    import random, string
    invite_code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))

    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    try:
        c.execute('INSERT INTO squads (squad_name, invite_code) VALUES (?, ?)', (squad_name, invite_code))
        squad_id = c.lastrowid
        c.execute('UPDATE profiles SET squad_id = ? WHERE username = ?', (squad_id, username))
        conn.commit()
        return jsonify({'success': True, 'invite_code': invite_code, 'squad_name': squad_name}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

@app.route('/api/squads/join', methods=['POST'])
def join_squad():
    data = request.json
    invite_code = data.get('invite_code', '').upper()
    username = data.get('username')
    
    if not invite_code or not username:
        return jsonify({'error': 'Missing invite_code or username'}), 400
        
    try:
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        
        c.execute('SELECT squad_id, squad_name FROM squads WHERE invite_code = ?', (invite_code,))
        row = c.fetchone()
        
        if not row:
            conn.close()
            return jsonify({'error': 'Invalid invite code'}), 404
            
        squad_id = str(row[0])
        squad_name = row[1]
        
        c.execute('UPDATE profiles SET squad_id = ? WHERE username = ?', (squad_id, username))
        conn.commit()
        conn.close()
        
        return jsonify({'success': True, 'squad_id': squad_id, 'squad_name': squad_name}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/leaderboard', methods=['GET'])
def get_leaderboard():
    try:
        scope = request.args.get('scope', default='global', type=str)
        squad_id = request.args.get('squad_id', default='', type=str)
        
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        
        if scope == 'squad' and squad_id:
            c.execute('SELECT username, start_weight, current_weight, target_weight FROM profiles WHERE squad_id = ?', (squad_id,))
        else:
            c.execute('SELECT username, start_weight, current_weight, target_weight FROM profiles')
            
        rows = c.fetchall()
        
        users = []
        for r in rows:
            name, start_w, curr_w, target_w = r
            prog = 0
            if curr_w > 0 and target_w > 0 and start_w != target_w:
                prog = min(100, max(0, ((start_w - curr_w) / (start_w - target_w)) * 100))
            users.append({
                'name': name,
                'progress_percentage': prog
            })
            
        users.sort(key=lambda x: x['progress_percentage'], reverse=True)
        conn.close()
        return jsonify(users), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/admin/end-season', methods=['POST'])
def end_season():
    """
    Execute backend seasonal promotion loops safely updating ranks and scrubbing temporal volume points.
    """
    try:
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        
        percentages = { 1: 0.50, 2: 0.25, 3: 0.10, 4: 0.01 }
        
        for current_r, percentage in percentages.items():
            c.execute('SELECT COUNT(*) FROM squads WHERE current_rank = ? AND season_volume > 0', (current_r,))
            count = c.fetchone()[0]
            if count == 0:
                continue
                
            promote_limit = math.ceil(count * percentage)
            
            c.execute('''
                SELECT squad_id FROM squads
                WHERE current_rank = ? AND season_volume > 0
                ORDER BY season_volume DESC
                LIMIT ?
            ''', (current_r, promote_limit))
            top_squads = [row[0] for row in c.fetchall()]
            
            if top_squads:
                placeholders = ','.join(['?'] * len(top_squads))
                c.execute(f'''
                    UPDATE squads 
                    SET current_rank = ? 
                    WHERE squad_id IN ({placeholders})
                ''', [current_r + 1] + top_squads)

        # Global temporal season wipe
        c.execute('UPDATE squads SET season_volume = 0')
        conn.commit()
        conn.close()
        
        return jsonify({'success': True, 'message': 'Season ended and vanguard ranks evaluated.'}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


def init_db():
    """Initialize the SQLite database with the squads table if it doesn't exist."""
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('''
        CREATE TABLE IF NOT EXISTS squads (
            squad_id INTEGER PRIMARY KEY AUTOINCREMENT,
            invite_code TEXT UNIQUE NOT NULL,
            total_volume INTEGER DEFAULT 0
        )
    ''')
    
    # Simple migration if total_volume doesn't exist on an old db
    try:
        c.execute('ALTER TABLE squads ADD COLUMN total_volume INTEGER DEFAULT 0')
    except sqlite3.OperationalError:
        pass # Column likely already exists

    try:
        c.execute('ALTER TABLE squads ADD COLUMN current_rank INTEGER DEFAULT 1')
        c.execute('ALTER TABLE squads ADD COLUMN season_volume INTEGER DEFAULT 0')
    except sqlite3.OperationalError:
        pass

    try:
        c.execute("ALTER TABLE squads ADD COLUMN squad_name TEXT DEFAULT 'Unnamed Squad'")
    except sqlite3.OperationalError:
        pass
        
    # Leaderboard Upgrade
    c.execute('''
        CREATE TABLE IF NOT EXISTS profiles (
            username TEXT PRIMARY KEY,
            start_weight REAL,
            current_weight REAL,
            target_weight REAL
        )
    ''')
    
    new_profile_cols = [
        ('name', 'TEXT'),
        ('age', 'INTEGER'),
        ('gender', 'TEXT'),
        ('height', 'REAL'),
        ('goal_date', 'TEXT'),
        ('frequency', 'INTEGER'),
        ('schedule', 'TEXT'),
        ('gym_type', 'TEXT'),
        ('primary_goal', 'TEXT'),
        ('equipment', 'TEXT'),
        ('can_pullup', 'INTEGER'),
        ('can_dip', 'INTEGER'),
        ('can_pushup', 'INTEGER'),
        ('can_barbell_press', 'INTEGER')
    ]
    for col_name, col_type in new_profile_cols:
        try:
            c.execute(f"ALTER TABLE profiles ADD COLUMN {col_name} {col_type}")
        except sqlite3.OperationalError:
            pass
    
    try:
        c.execute("ALTER TABLE profiles ADD COLUMN squad_id INTEGER")
    except sqlite3.OperationalError:
        pass
        
    try:
        c.execute("ALTER TABLE posts ADD COLUMN squad_id INTEGER")
    except sqlite3.OperationalError:
        pass
        
    c.execute("CREATE TABLE IF NOT EXISTS squads (id INTEGER PRIMARY KEY AUTOINCREMENT, squad_name TEXT NOT NULL, invite_code TEXT UNIQUE NOT NULL)")
    
    try:
        c.execute("ALTER TABLE profiles ADD COLUMN squad_id TEXT DEFAULT ''")
    except sqlite3.OperationalError:
        pass
        
    try:
        c.execute("ALTER TABLE posts ADD COLUMN workout_data TEXT")
    except sqlite3.OperationalError:
        pass
        
    c.execute('''
        CREATE TABLE IF NOT EXISTS templates (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL,
            template_name TEXT NOT NULL,
            exercises TEXT NOT NULL
        )
    ''')
    
    c.execute('''
        CREATE TABLE IF NOT EXISTS routines (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL,
            routine_name TEXT NOT NULL,
            schedule_json TEXT NOT NULL
        )
    ''')

    
    
    # Seed mock users if empty
    c.execute('SELECT COUNT(*) FROM profiles')
    if c.fetchone()[0] == 0:
        c.executemany('INSERT INTO profiles (username, start_weight, current_weight, target_weight, squad_id) VALUES (?, ?, ?, ?, ?)', [
            ('Alex K.', 90, 85, 80, 'mock-squad-1'),
            ('Sarah O.', 65, 62, 60, 'mock-squad-2'),
            ('Mike T.', 110, 105, 95, ''),
            ('Jessica R.', 70, 68, 65, 'mock-squad-1'),
            ('Tom W.', 85, 85, 80, '')
        ])

    # Social Feed Upgrade
    c.execute('''
        CREATE TABLE IF NOT EXISTS posts (
            post_id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL,
            image_url TEXT NOT NULL,
            caption TEXT,
            is_close_friends BOOLEAN DEFAULT 0,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            workout_data TEXT
        )
    ''')
    
    c.execute('''
        CREATE TABLE IF NOT EXISTS likes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            post_id INTEGER,
            username TEXT,
            UNIQUE(post_id, username)
        )
    ''')
    
    c.execute('''
        CREATE TABLE IF NOT EXISTS comments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            post_id INTEGER,
            username TEXT,
            comment_text TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    conn.commit()
    conn.close()

# Initialize DB on startup
init_db()

def generate_invite_code(length=6):
    """Generate a random alphanumeric uppercase string of given length."""
    chars = string.ascii_uppercase + string.digits
    return ''.join(random.choice(chars) for _ in range(length))





@app.route('/api/squads/disband', methods=['DELETE'])
def disband_squad():
    """
    DELETE /api/squads/disband
    Expects JSON payload with 'squad_id'. Deletes the squad from the database.
    """
    try:
        data = request.get_json()
        if not data or 'squad_id' not in data:
            return jsonify({'success': False, 'error': 'Missing squad_id'}), 400
            
        squad_id = data['squad_id']
        
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        c.execute('DELETE FROM squads WHERE squad_id = ?', (squad_id,))
        
        if c.rowcount == 0:
            conn.close()
            return jsonify({'success': False, 'error': 'Squad not found'}), 404
            
        conn.commit()
        conn.close()
        
        return jsonify({'success': True, 'message': 'Squad disbanded successfully'}), 200
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/arena/sync', methods=['POST'])
def arena_sync():
    """
    POST /api/arena/sync
    Accepts JSON: {'squad_id': ..., 'workout_volume': ...}
    Updates total_volume by adding workflow_volume.
    """
    try:
        data = request.get_json()
        if not data or 'squad_id' not in data or 'workout_volume' not in data:
            return jsonify({'success': False, 'error': 'Missing squad_id or workout_volume'}), 400
            
        squad_id = data['squad_id']
        workout_volume = int(data['workout_volume'])
        
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        
        c.execute('UPDATE squads SET total_volume = total_volume + ?, season_volume = season_volume + ? WHERE squad_id = ?', 
                 (workout_volume, workout_volume, squad_id))
                 
        if c.rowcount == 0:
            conn.close()
            return jsonify({'success': False, 'error': 'Squad not found'}), 404
            
        conn.commit()
        conn.close()
        
        return jsonify({'success': True, 'message': 'Volume synced successfully'}), 200
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/arena/leaderboard', methods=['GET'])
def arena_leaderboard():
    """
    GET /api/arena/leaderboard
    Returns JSON array of top 10 squads ordered by total_volume DESC.
    """
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        c = conn.cursor()
        
        c.execute('''
            SELECT squad_id, invite_code, total_volume 
            FROM squads 
            ORDER BY total_volume DESC 
            LIMIT 10
        ''')
        
        rows = c.fetchall()
        conn.close()
        
        leaderboard = []
        for r in rows:
            leaderboard.append({
                'squad_id': r['squad_id'],
                'invite_code': r['invite_code'],
                'total_volume': r['total_volume']
            })
            
        return jsonify({'success': True, 'leaderboard': leaderboard}), 200
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/workouts/log', methods=['POST', 'OPTIONS'])
def log_workout():
    if request.method == 'OPTIONS':
        return jsonify({'success': True}), 200
        
    data = request.json or {}
    username = data.get('username')
    
    if not username:
        return jsonify({'success': False, 'error': 'Missing username in request'}), 400
    exercises = data.get('exercises', [])
    import json
    workout_data_json = json.dumps(exercises) if exercises else None
    
    dynamic_caption = f"Completed a workout with {len(exercises)} exercises! 🏆" if exercises else "Crushed a Quick Start workout! 🏆"

    try:
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        
        # 1. Generate the exact current date and time
        current_timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        
        # 2. Force the timestamp into the database!
        c.execute('''
            INSERT INTO posts (username, image_url, caption, is_close_friends, timestamp, workout_data) 
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (username, "", dynamic_caption, 0, current_timestamp, workout_data_json))
        
        conn.commit()
        conn.close()
        return jsonify({'success': True, 'message': 'Workout saved to SQLite!'}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/history', methods=['GET'])
def get_user_history():
    """
    GET /api/history?username=...
    Returns a JSON array of YYYY-MM-DD dates where the user created a post or logged a workout.
    """
    try:
        username = request.args.get('username')
        if not username:
            return jsonify({'error': 'Missing username'}), 400
            
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        
        # Extract unique dates from the timestamp column dropping seconds natively
        c.execute('''
            SELECT DISTINCT SUBSTR(timestamp, 1, 10) 
            FROM posts 
            WHERE username = ? 
        ''', (username,))
        
        rows = c.fetchall()
        conn.close()
        
        dates = [r[0] for r in rows if r[0]]
        return jsonify(dates), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/history/details', methods=['GET'])
def get_user_history_details():
    """
    GET /api/history/details?username=...&date=YYYY-MM-DD
    Returns the workout details for a specific day.
    """
    try:
        username = request.args.get('username')
        date_str = request.args.get('date')
        
        if not username or not date_str:
            return jsonify({'error': 'Missing username or date'}), 400
            
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        c = conn.cursor()
        
        # We query the posts table for this username matching the date prefix in timestamp
        c.execute('''
            SELECT post_id, username, image_url, caption, timestamp, workout_data
            FROM posts 
            WHERE username = ? AND timestamp LIKE ?
            ORDER BY timestamp DESC
        ''', (username, date_str + '%'))
        
        rows = c.fetchall()
        conn.close()
        
        if not rows:
            return jsonify({'success': True, 'exists': False}), 200
            
        import json
        all_exercises = []
        latest_image = ""
        latest_timestamp = None
        
        for row in rows:
            row_dict = dict(row)
            
            wd = row_dict.get('workout_data')
            if wd:
                try:
                    parsed_exercises = json.loads(wd)
                    if isinstance(parsed_exercises, list):
                        all_exercises.extend(parsed_exercises)
                except:
                    pass
            
            # Keep aggregate references for the daily UX
            if not latest_image and row_dict.get('image_url'):
                latest_image = row_dict.get('image_url')
            if not latest_timestamp:
                latest_timestamp = row_dict.get('timestamp')
                
        final_caption = f"Crushed {len(all_exercises)} exercises across {len(rows)} sessions! 🏆"

        workout_data = {
            'username': username,
            'image_url': latest_image,
            'caption': final_caption,
            'timestamp': latest_timestamp,
            'exercises': all_exercises
        }
        
        return jsonify({'success': True, 'exists': True, 'data': workout_data}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/user/streak', methods=['GET'])
def get_user_streak():
    """
    GET /api/user/streak?username=...
    Dynamically calculates active daily streak from posts table.
    """
    try:
        username = request.args.get('username')
        if not username:
            return jsonify({'success': False, 'error': 'Missing username'}), 400
            
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        c = conn.cursor()
        
        # Any post counts as a workout day
        c.execute('''
            SELECT DISTINCT SUBSTR(timestamp, 1, 10) as date 
            FROM posts 
            WHERE username = ? 
            ORDER BY date DESC
        ''', (username,))
        rows = c.fetchall()
        conn.close()
        
        from datetime import datetime, timedelta
        
        dates = [datetime.strptime(r['date'], '%Y-%m-%d').date() for r in rows]
        if not dates: 
            return jsonify({'success': True, 'streak': 0, 'at_risk': False}), 200

        today = datetime.now().date()
        streak = 0
        current_check_date = today

        # If the most recent workout isn't today or yesterday, streak is dead.
        if dates[0] != today and dates[0] != (today - timedelta(days=1)):
            return jsonify({'success': True, 'streak': 0, 'at_risk': False}), 200

        # If they worked out today, start checking from today. Else, start from yesterday.
        if dates[0] == today:
            current_check_date = today
        else:
            current_check_date = today - timedelta(days=1)

        for d in dates:
            if d == current_check_date:
                streak += 1
                current_check_date -= timedelta(days=1)
            elif d > current_check_date:
                continue # Handle multiple workouts on the same day just in case
            else:
                break # Gap found
                
        is_at_risk = (streak > 0) and (dates[0] != today)

        return jsonify({'success': True, 'streak': streak, 'at_risk': is_at_risk}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/templates/create', methods=['POST'])
def create_template():
    data = request.json
    template_id = data.get('id') # Optional for updates
    username = data.get('username')
    template_name = data.get('template_name')
    exercises = data.get('exercises', [])
    
    if not username or not template_name:
        return jsonify({'success': False, 'error': 'Missing name or template_name'}), 400
        
    import json
    exercises_json = json.dumps(exercises)
    
    try:
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        
        if template_id:
            c.execute('''
                UPDATE templates 
                SET template_name = ?, exercises = ? 
                WHERE id = ? AND username = ?
            ''', (template_name, exercises_json, template_id, username))
        else:
            c.execute('''
                INSERT INTO templates (username, template_name, exercises)
                VALUES (?, ?, ?)
            ''', (username, template_name, exercises_json))
            
        conn.commit()
        conn.close()
        return jsonify({'success': True}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/templates/delete', methods=['DELETE'])
def delete_template():
    template_id = request.args.get('id')
    username = request.args.get('username')
    
    if not template_id or not username:
        return jsonify({'success': False, 'error': 'Missing id or username'}), 400
        
    try:
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        c.execute('DELETE FROM templates WHERE id = ? AND username = ?', (template_id, username))
        conn.commit()
        conn.close()
        return jsonify({'success': True}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/templates', methods=['GET'])
def get_templates():
    username = request.args.get('username')
    if not username:
        return jsonify({'success': False, 'error': 'Missing username'}), 400
        
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        c = conn.cursor()
        c.execute('SELECT id, template_name, exercises FROM templates WHERE username = ? ORDER BY id DESC', (username,))
        rows = c.fetchall()
        conn.close()
        
        import json
        templates = []
        for r in rows:
            templates.append({
                'id': r['id'],
                'template_name': r['template_name'],
                'exercises': json.loads(r['exercises'])
            })
            
        return jsonify({'success': True, 'templates': templates}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/routines', methods=['GET', 'POST'])
def handle_routines():
    username = request.args.get('username') or (request.json.get('username') if request.is_json else None)
    if not username:
        return jsonify({'success': False, 'error': 'Missing username'}), 400
        
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        c = conn.cursor()
        
        if request.method == 'GET':
            c.execute('SELECT id, routine_name, schedule_json FROM routines WHERE username = ? ORDER BY id DESC LIMIT 1', (username,))
            row = c.fetchone()
            
            if not row:
                conn.close()
                return jsonify({'success': True, 'routine': None}), 200
                
            import json
            routine_data = {
                'id': row['id'],
                'routine_name': row['routine_name'],
                'schedule': json.loads(row['schedule_json'])
            }
            conn.close()
            return jsonify({'success': True, 'routine': routine_data}), 200
            
        elif request.method == 'POST':
            data = request.json
            routine_name = data.get('routine_name', 'My Auto-Coach Program')
            schedule = data.get('schedule', [])
            
            import json
            schedule_json = json.dumps(schedule)
            
            c.execute('SELECT id FROM routines WHERE username = ?', (username,))
            existing = c.fetchone()
            
            if existing:
                c.execute('UPDATE routines SET routine_name = ?, schedule_json = ? WHERE username = ?', (routine_name, schedule_json, username))
            else:
                c.execute('INSERT INTO routines (username, routine_name, schedule_json) VALUES (?, ?, ?)', (username, routine_name, schedule_json))
                
            conn.commit()
            conn.close()
            return jsonify({'success': True}), 200
            
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/workouts/history', methods=['GET'])
def get_workout_history():
    """
    GET /api/workouts/history
    Returns global mock_database['history'] list.
    """
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        c = conn.cursor()
        c.execute("SELECT DISTINCT SUBSTR(timestamp, 1, 10) as date FROM posts")
        rows = [{"date": r["date"]} for r in c.fetchall()]
        conn.close()
        return jsonify({'success': True, 'history': rows}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/posts', methods=['POST'])
def upload_post():
    """
    POST /api/posts
    Expects multipart/form-data. Uploads image to Cloudinary and saves post metadata to 'posts' table.
    """
    print(">>> BACKEND IS AWAKE: RECEIVED POST REQUEST")
    try:
        username = request.form.get('username', 'Unknown Athlete')
        caption = request.form.get('caption', '')
        # Safely parse boolean, defaulting to False
        is_close_friends_raw = request.form.get('is_close_friends', 'false')
        is_close_friends = 1 if str(is_close_friends_raw).lower() == 'true' else 0

        image_url = request.form.get('image_url')
        if image_url:
            secure_url = image_url
        else:
            if 'image' not in request.files or not request.files['image'].filename:
                return jsonify({'success': False, 'error': 'Missing or empty image file.'}), 400
                
            file_to_upload = request.files['image']
            upload_result = cloudinary.uploader.upload(file_to_upload)
            secure_url = upload_result.get('secure_url')
            
            if not secure_url:
                return jsonify({'success': False, 'error': 'Cloudinary URL empty format.'}), 500
            
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        c.execute('''
            INSERT INTO posts (username, image_url, caption, is_close_friends)
            VALUES (?, ?, ?, ?)
        ''', (username, secure_url, caption, is_close_friends))
        new_post_id = c.lastrowid
        conn.commit()
        conn.close()
        
        return jsonify({
            'success': True, 
            'post': {
                'post_id': new_post_id,
                'username': username,
                'image_url': secure_url,
                'caption': caption,
                'is_close_friends': bool(is_close_friends)
            }
        }), 200

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/posts/<int:post_id>', methods=['DELETE'])
def delete_post(post_id):
    """
    DELETE /api/posts/<post_id>
    Deletes the post with the given ID.
    """
    try:
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        c.execute('DELETE FROM posts WHERE post_id = ?', (post_id,))
        
        if c.rowcount == 0:
            conn.close()
            return jsonify({'success': False, 'error': 'Post not found'}), 404
            
        conn.commit()
        conn.close()
        
        return jsonify({'success': True, 'message': 'Post deleted successfully'}), 200
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/posts/<int:post_id>/like', methods=['POST'])
def toggle_like(post_id):
    """
    POST /api/posts/<post_id>/like
    Toggles the like status for a user. Expected JSON: { 'username': '...' }
    """
    try:
        data = request.json
        username = data.get('username')
        if not username:
            return jsonify({'error': 'Missing username'}), 400
            
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        
        c.execute('SELECT id FROM likes WHERE post_id = ? AND username = ?', (post_id, username))
        row = c.fetchone()
        
        if row:
            c.execute('DELETE FROM likes WHERE id = ?', (row[0],))
            liked = False
        else:
            c.execute('INSERT INTO likes (post_id, username) VALUES (?, ?)', (post_id, username))
            liked = True
            
        c.execute('SELECT COUNT(*) FROM likes WHERE post_id = ?', (post_id,))
        total_likes = c.fetchone()[0]
        
        conn.commit()
        conn.close()
        
        return jsonify({'success': True, 'liked': liked, 'total_likes': total_likes}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/posts', methods=['GET'])
def fetch_posts():
    """
    GET /api/posts
    Returns standard chronological posts timeline, optionally filtered by username.
    """
    try:
        username_filter = request.args.get('username')
        request_user = request.args.get('request_user', '')
        
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        c = conn.cursor()
        
        query = '''
            SELECT p.post_id, p.username, p.image_url, p.caption, p.is_close_friends, p.timestamp,
                   (SELECT COUNT(*) FROM likes WHERE post_id = p.post_id) as total_likes,
                   (SELECT COUNT(*) FROM likes WHERE post_id = p.post_id AND username = ?) as is_liked_by_me
            FROM posts p
            WHERE p.timestamp >= datetime('now', '-1 day') AND p.image_url != ""
        '''
        params = [request_user]
        
        if username_filter:
            query += ' AND p.username = ? '
            params.append(username_filter)
            
        query += ' ORDER BY p.timestamp DESC'
        
        c.execute(query, tuple(params))
        rows = c.fetchall()
        conn.close()
        
        posts_grid = []
        for r in rows:
            posts_grid.append({
                'post_id': r['post_id'],
                'username': r['username'],
                'image_url': r['image_url'],
                'caption': r['caption'],
                'is_close_friends': bool(r['is_close_friends']),
                'timestamp': r['timestamp'],
                'total_likes': r['total_likes'] or 0,
                'is_liked_by_me': bool(r['is_liked_by_me'])
            })
            
        return jsonify({'success': True, 'posts': posts_grid}), 200
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/comments/add', methods=['POST'])
def add_comment():
    """
    POST /api/comments/add
    Inserts a comment tightly mapped to a post_id natively executing temporal DB defaults.
    """
    try:
        data = request.json
        post_id = data.get('post_id')
        username = data.get('username')
        comment_text = data.get('comment_text')
        
        if not post_id or not username or not comment_text:
            return jsonify({'success': False, 'error': 'Missing required fields (post_id, username, comment_text)'}), 400
            
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        c.execute('INSERT INTO comments (post_id, username, comment_text) VALUES (?, ?, ?)', (post_id, username, comment_text))
        conn.commit()
        conn.close()
        
        return jsonify({'success': True}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/comments', methods=['GET'])
def get_comments():
    """
    GET /api/comments?post_id=X
    Retrieves arrays sorted chronologically mapped tightly.
    """
    try:
        post_id = request.args.get('post_id')
        if not post_id:
            return jsonify({'success': False, 'error': 'Missing post_id param'}), 400
            
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        c = conn.cursor()
        c.execute('SELECT id, post_id, username, comment_text, timestamp FROM comments WHERE post_id = ? ORDER BY timestamp ASC', (post_id,))
        rows = c.fetchall()
        conn.close()
        
        payload = [dict(r) for r in rows]
        return jsonify({'success': True, 'comments': payload}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

if __name__ == '__main__':
    # Run locally with debug mode. In production, Gunicorn will serve the `app` object.
    app.run(host='0.0.0.0', port=5001, debug=True)
