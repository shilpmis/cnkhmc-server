with open('app/controllers/StudentManagementController.ts', 'r', encoding='utf-8') as f:
    content = f.read()

import re
content = re.sub(r"    let schoolId = ctx\.auth\.user\?\.school_id\n", "", content)
content = re.sub(r"    let school_id = ctx\.auth\.user!\.school_id\n", "", content)

with open('app/controllers/StudentManagementController.ts', 'w', encoding='utf-8') as f:
    f.write(content)
