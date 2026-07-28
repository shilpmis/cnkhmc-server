with open('app/controllers/StudentManagementController.ts', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if 'public async ' in line:
        # Check if the method uses school_id or schoolId
        method_body = "".join(lines[i:i+100]) # Approximate method length
        if 'school_id!' in method_body or 'school_id !==' in method_body or 'school_id as number' in method_body:
            # We need to insert let school_id = ctx.auth.user?.school_id right after the signature
            # if it's not already there.
            if 'let school_id' not in method_body and 'const school_id' not in method_body:
                # Find the line with public async and {
                for j in range(i, i+10):
                    if '{' in lines[j]:
                        # If ctx is present, use it, else auth
                        if 'ctx' in line or 'ctx:' in lines[j]:
                            lines.insert(j+1, "    let school_id = ctx.auth.user?.school_id\n")
                        elif 'auth' in line or 'auth' in lines[j]:
                            lines.insert(j+1, "    let school_id = auth.user?.school_id\n")
                        break
        elif 'schoolId!' in method_body or 'schoolId !==' in method_body:
            if 'let schoolId' not in method_body and 'const schoolId' not in method_body:
                for j in range(i, i+10):
                    if '{' in lines[j]:
                        if 'ctx' in line or 'ctx:' in lines[j]:
                            lines.insert(j+1, "    let schoolId = ctx.auth.user?.school_id\n")
                        elif 'auth' in line or 'auth' in lines[j]:
                            lines.insert(j+1, "    let schoolId = auth.user?.school_id\n")
                        break

with open('app/controllers/StudentManagementController.ts', 'w', encoding='utf-8') as f:
    f.writelines(lines)
