# Read the file and fix the unclosed View tag
with open('app/worker/index.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# The error is at line 246, position 177 - an unclosed View
# Find the pattern and fix it
# Based on the error, there's a View that's not closed properly

lines = content.split('\n')
line_246 = lines[245]  # 0-indexed

# Find the View style={s.card, s.between} pattern and ensure it's closed
# The line shows: ...<View style={[s.card, s.between]}><View>...
# It should be closed with </View></View>

# Replace the problematic pattern
fixed = content.replace(
    '<View style={[s.card, s.between]}><View>',
    '<View style={[s.card, s.between]}><View>',
)

# Actually, let's look for the specific pattern around "Location permission"
if 'Location permission' in line_246:
    # This is the area function
    # Find where the View is unclosed
    # The pattern should be: <View style={[s.card, s.between]}><View>...</View><Button ... /></View>
    # Let's check if there's a missing </View>
    
    # Count opening and closing View tags in this line
    open_views = line_246.count('<View')
    close_views = line_246.count('</View>')
    
    print(f"Open View tags: {open_views}")
    print(f"Close View tags: {close_views}")
    
    if open_views > close_views:
        print(f"Missing {open_views - close_views} closing View tag(s)")
        
# Write back if needed
