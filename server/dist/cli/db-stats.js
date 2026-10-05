#!/usr/bin/env node
"use strict";
/**
 * CLI Tool: Database Statistics
 * Usage: npm run db:stats
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
// Load environment variables
dotenv_1.default.config();
const database_1 = require("../services/database");
async function main() {
    const db = new database_1.QuestionDatabase();
    console.log('📊 Database Statistics\n');
    try {
        const stats = await db.getStatistics();
        console.log('Overall:');
        console.log(`  - Total Questions: ${stats.total_questions}`);
        console.log(`  - Total Exams: ${stats.total_exams}`);
        console.log(`  - Total Subjects: ${stats.total_subjects}`);
        console.log(`  - Total Years: ${stats.total_years}`);
        console.log('\n📚 Questions by Exam Type:');
        stats.byExamType.forEach((item) => {
            console.log(`  - ${item.exam_type}: ${item.count}`);
        });
        console.log('\n📖 Questions by Subject:');
        stats.bySubject.slice(0, 10).forEach((item) => {
            console.log(`  - ${item.subject}: ${item.count}`);
        });
        if (stats.bySubject.length > 10) {
            console.log(`  ... and ${stats.bySubject.length - 10} more subjects`);
        }
        console.log('\n⭐ Questions by Difficulty:');
        stats.byDifficulty.forEach((item) => {
            console.log(`  - ${item.difficulty}: ${item.count}`);
        });
        // Show recent exams
        const examTypes = await db.getExamTypes();
        if (examTypes.length > 0) {
            console.log('\n🎓 Available Exams:');
            for (const examType of examTypes.slice(0, 5)) {
                const examStats = await db.getExamStatistics(examType);
                console.log(`  - ${examType}:`);
                console.log(`      Questions: ${examStats.total_questions}`);
                console.log(`      Subjects: ${examStats.total_subjects}`);
                console.log(`      Years: ${examStats.total_years}`);
            }
        }
        db.close();
    }
    catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}
main();
//# sourceMappingURL=db-stats.js.map