# Fix line 246 in worker/index.tsx
with open('app/worker/index.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Line 246 (0-indexed 245) - replace it with the corrected version
old_line = lines[245]

# The corrected line with proper closing tags
new_line = '''  return <ScrollView contentContainerStyle={s.content}><Header title="Select your working area" subtitle="Choose where you can provide service" onBack={() => go("details")} /><View style={s.gap16}><Field label="Search location" value="Ahmedabad" placeholder="Search city, area or pincode" /><Card><MapCard destination="Current location · Ahmedabad" /></Card><View style={s.between}><Text style={s.inputLabel}>Service radius</Text><Text style={s.textButtonText}>{radius}</Text></View><View style={s.rowWrap}>{["5 km", "10 km", "15 km", "25 km"].map((x) => <Pressable key={x} testID={`radius-${x.replace(" ", "-")}`} onPress={() => setRadius(x)} style={[s.chip, radius === x && s.chipSelected]}><Text style={[s.chipText, radius === x && s.chipSelectedText]}>{x}</Text></Pressable>)}</View><Text style={s.inputLabel}>Selected areas</Text>{areasError ? <Text style={{ color: "#C94A4A", fontSize: 13, marginTop: 8 }}>{areasError}</Text> : null}{loadingAreas ? <ActivityIndicator size="small" color="#0B63CE" style={{ marginTop: 8 }} /> : <View style={s.rowWrap}>{serviceAreas.length > 0 ? serviceAreas.map((x) => <View key={x} style={[s.chip, s.chipSelected]}><Text style={s.chipSelectedText}>{x}  ×</Text></View>) : <Text style={s.muted}>No service areas available</Text>}</View>}<View style={[s.card, s.between]}><View><Text style={s.h3}>Location permission</Text><Text style={s.muted}>Use your current location for nearby jobs</Text></View><Button testID="area-allow-location" title="Allow" secondary onPress={() => Alert.alert("Location enabled", "ShedX can now show nearby jobs.")} /></View></View><View style={s.cardGap}><Text style={s.inputLabel}>Working days</Text><View style={s.rowWrap}>{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((x) => <View key={x} style={[s.chip, s.chipSelected]}><Text style={s.chipSelectedText}>{x}</Text></View>)}</View><Text style={s.inputLabel}>Working hours</Text><Text style={s.body}>09:00 AM – 06:00 PM</Text><View style={s.divider} /><View style={s.between}><View><Text style={s.h3}>Save your service area</Text><Text style={s.muted}>You can update this later in settings</Text></View><Button testID="area-save" title="Save & Continue" onPress={() => go("ready")} /></View></View></ScrollView>; }
'''

lines[245] = new_line + '\n'

# Write back
with open('app/worker/index.tsx', 'w', encoding='utf-8') as f:
    f.writelines(lines)

print("Fixed line 246")
