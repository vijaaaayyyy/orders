import re

path = r'C:\Users\vijay\Downloads\3kBkIreSXEar3bdW-grok-workspace\src\components\mess-app.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Find the img tag location
img_marker = '        />\n        <div className="relative z-10 flex flex-wrap items-end justify-between gap-5">'
idx = content.find(img_marker)

if idx == -1:
    print("img_marker not found")
    exit(1)

# Find the closing </section> after the img
section_close = content.find('</section>', idx)
if section_close == -1:
    print("section close not found")
    exit(1)

# Everything before the img tag (keep the img tag)
before = content[:idx + len('        />')]

# Everything after the closing </section>
after = content[section_close + len('</section>'):]

# New overlay content
overlay = '''
        {featured && (
          <div className="absolute inset-0 flex items-end justify-start p-5 sm:p-7">
            <div className="min-w-0">
              <p className="font-display text-7xl leading-[0.82] font-semibold tabular-nums sm:text-8xl text-white drop-shadow-lg">
                {featured.token}
              </p>
              <p className="truncate text-base font-medium text-white drop-shadow-md">
                {featured.item}
              </p>
              <p className="truncate text-sm text-white/80 drop-shadow-md">
                {featuredStation ?? "Kitchen"} · ready to collect
              </p>
            </div>
          </div>
        )}
      </section>'''

new_content = before + overlay + after

with open(path, 'w', encoding='utf-8') as f:
    f.write(new_content)

print("Done! File updated.")
print(f"Before length: {len(content)}")
print(f"After length: {len(new_content)}")
