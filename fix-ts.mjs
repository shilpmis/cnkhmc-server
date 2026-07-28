import { Project, SyntaxKind } from 'ts-morph';

const project = new Project();
project.addSourceFilesAtPaths("app/controllers/StudentManagementController.ts");
project.addSourceFilesAtPaths("app/controllers/TimeTableController.ts");

// 1. StudentManagementController
const smc = project.getSourceFile("app/controllers/StudentManagementController.ts");

if (smc) {
    const asImport = smc.getImportDeclaration(i => i.getModuleSpecifierValue() === '#models/AcademicSession');
    if (asImport) asImport.remove();

    smc.getDescendantsOfKind(SyntaxKind.PropertyAssignment).forEach(prop => {
        if (prop.getName() === 'academic_session_id') {
            prop.replaceWithText('academic_year: ' + prop.getInitializer().getText());
        }
    });

    smc.getDescendantsOfKind(SyntaxKind.PropertyAccessExpression).forEach(pae => {
        if (pae.getName() === 'source_academic_session_id') {
            pae.replaceWithText(pae.getExpression().getText() + '.source_academic_year');
        }
        if (pae.getName() === 'target_academic_session_id') {
            pae.replaceWithText(pae.getExpression().getText() + '.target_academic_year');
        }
    });

    smc.getDescendantsOfKind(SyntaxKind.VariableDeclaration).forEach(vd => {
        const init = vd.getInitializer();
        if (init && init.getText().includes('AcademicSession.query()')) {
            if (vd.getName() === 'active_academic_session') {
                init.replaceWithText('{ id: payload.academic_year || 2026 }');
            } else if (vd.getName() === 'session' || vd.getName() === 'sourceSession') {
                init.replaceWithText('{ id: payload.source_academic_year }');
            } else if (vd.getName() === 'targetSession') {
                init.replaceWithText('{ id: payload.target_academic_year }');
            }
        }
    });

    smc.getDescendantsOfKind(SyntaxKind.CallExpression).forEach(callExpr => {
        const expr = callExpr.getExpression();
        if (expr.getKind() === SyntaxKind.PropertyAccessExpression) {
            const propAccess = expr;
            const name = propAccess.getName();
            if (name === 'where' || name === 'andWhere') {
                const args = callExpr.getArguments();
                if (args.length >= 1 && args[0].getKind() === SyntaxKind.StringLiteral && args[0].getText() === "'academic_session_id'") {
                    args[0].replaceWithText("'academic_year'");
                }
            }
        }
    });
    smc.saveSync();
}

// 2. TimeTableController
const ttc = project.getSourceFile("app/controllers/TimeTableController.ts");

if (ttc) {
    const ttcAsImport = ttc.getImportDeclaration(i => i.getModuleSpecifierValue() === '#models/AcademicSession');
    if (ttcAsImport) ttcAsImport.remove();

    ttc.getDescendantsOfKind(SyntaxKind.PropertyAssignment).forEach(prop => {
        if (prop.getName() === 'academic_session_id') {
            prop.replaceWithText('academic_year: ' + prop.getInitializer().getText());
        }
    });

    ttc.getDescendantsOfKind(SyntaxKind.VariableDeclaration).forEach(vd => {
        const init = vd.getInitializer();
        if (init && init.getText().includes('AcademicSession.query()')) {
            init.replaceWithText('{ id: payload.academic_year || 2026, is_active: true }');
        }
    });

    ttc.getDescendantsOfKind(SyntaxKind.CallExpression).forEach(callExpr => {
        const expr = callExpr.getExpression();
        if (expr.getKind() === SyntaxKind.PropertyAccessExpression) {
            const propAccess = expr;
            const name = propAccess.getName();
            if (name === 'where' || name === 'andWhere') {
                const args = callExpr.getArguments();
                if (args.length >= 1 && args[0].getKind() === SyntaxKind.StringLiteral && args[0].getText() === "'academic_session_id'") {
                    args[0].replaceWithText("'academic_year'");
                }
            }
        }
    });
    ttc.saveSync();
}

console.log('AST manipulation complete.');
