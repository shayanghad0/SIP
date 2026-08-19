# 🎓 School Intelligence Platform (SIP)

> An intelligent school management and educational analytics platform designed to solve real educational problems using algorithms and data-driven insights instead of functioning as a traditional attendance or grading system.

---

# 📖 About

School Intelligence Platform (SIP) is a modern web application built for educational institutions. The project's primary objective is to help school administrators, teachers, consultants, parents, and students make better decisions through intelligent analysis and predictive algorithms.

Unlike conventional school management systems, SIP focuses on identifying educational risks early, improving communication between all stakeholders, and providing actionable recommendations using AI-powered analytics.

---

# 🎯 Project Goals

The platform is designed to solve common educational challenges, including:

- Early detection of academic decline
- Limited communication between schools and parents
- Lack of analytical tools for school administrators
- Limited time for educational consultants
- Difficulty identifying at-risk students
- Personalized learning recommendations
- Data-driven educational decision making

---

# 👥 User Roles

The platform includes dedicated dashboards for five different roles.

## 👨‍💼 Administrator

- School statistics
- Student management
- Teacher management
- Consultant management
- Parent management
- School analytics
- AI reports
- Risk monitoring

---

## 👨‍🏫 Teacher

- Manage assigned classes
- Attendance
- Homework
- Exams
- Student grades
- Behavioral reports
- Student performance analysis

---

## 👩‍💼 Consultant

- Mental health monitoring
- Weekly student evaluations
- High-risk student detection
- Family recommendations
- Academic counseling
- AI-generated suggestions

---

## 👨‍👩‍👧 Parent

- Academic progress
- Attendance reports
- Homework tracking
- Teacher notes
- AI recommendations
- Weekly progress reports

---

## 👨‍🎓 Student

- Grades
- Homework
- Attendance
- Study plans
- Weekly mental health forms
- AI recommendations
- Performance analytics

---

# 🧠 Intelligent Algorithms

## 1. Early Warning AI

Each student receives a dynamic **Risk Score (0–100)** based on multiple educational indicators.

### Inputs

- Academic grades
- Attendance
- Late arrivals
- Behavior reports
- Homework completion
- Examination results
- Classroom participation
- Weekly wellness questionnaire

When the Risk Score exceeds **75**, the system automatically notifies:

- Administrator
- Educational Consultant
- Parent

---

## 2. Mental Health Analysis

Students complete a short weekly wellness questionnaire.

The system evaluates:

- Stress level
- Anxiety indicators
- Academic motivation
- Burnout risk
- Risk of academic decline
- Dropout probability

---

## 3. Teacher Performance Analytics

The platform evaluates teaching performance using data collected from assigned classes.

Metrics include:

- Student improvement rate
- Class average trends
- Assignment completion
- Exam difficulty
- Teaching effectiveness
- Historical comparisons

---

## 4. School Management Analytics

Administrators receive intelligent dashboards showing:

- High-risk students
- High-risk classes
- High-risk grades
- Performance trends
- Attendance trends
- Overall school performance

---

## 5. Smart Academic Guidance

Instead of relying on traditional aptitude tests, the platform recommends suitable academic paths based on:

- Interests
- Academic performance
- Personality
- Skills
- Projects
- Learning behavior

---

## 6. Grade Prediction

The AI estimates future academic performance.

Examples:

- Mathematics Pass Probability: **93%**
- Physics Performance Decline Probability: **76%**

---

## 7. Parent Insights

Parents receive personalized recommendations, including:

- Best study schedule
- Sleep recommendations
- Weak subjects
- Suggested activities
- Learning progress
- Weekly reports

---

## 8. Cheating Detection

The system analyzes examination patterns to identify:

- Suspicious answer similarity
- Repeated identical responses
- Unusual grading behavior
- Potential academic dishonesty

---

## 9. Personalized Study Planner

The AI automatically generates study schedules.

Example

Monday

- Mathematics — 45 minutes
- Chemistry — 30 minutes
- Biology Practice Tests

The schedule adapts continuously according to the student's performance.

---

## 10. School Analytics

Interactive dashboards provide:

- Performance by grade
- Performance by class
- Performance by teacher
- Attendance statistics
- Passing rates
- Subject analysis
- Trend visualization

---

# 🚀 Installation Wizard

On the very first launch, if no administrator account exists, the application automatically redirects to:

```
/install
```

The installation wizard guides the administrator through the complete school setup.

## Step 1

Administrator

- Full Name
- Username
- Password

---

## Step 2

Create School Grades

Minimum:

- 2 Grades

Example

```
Grade 1
Grade 2
Grade 3
```

---

## Step 3

Create Classes

Each grade can contain multiple classes.

Example

```
Grade 1

Class 1
Class 2
Class 3
Class 4
```

---

## Step 4

Create Lessons

The administrator manually creates school subjects.

Each lesson has:

- Lesson Name
- Importance Score (3–10)

This step may be skipped during installation.

---

## Step 5

Create Consultant Accounts

Required information

- Full Name
- Username
- Password

---

## Step 6

Create Student Accounts

Required information

- Full Name
- Username
- Password
- Grade
- Class
- Father's Name
- Mother's Name

A corresponding Parent account is automatically created.

Both Student and Parent receive:

- Username
- Password
- Access Code

---

## Step 7

Create Teacher Accounts

Required information

- Full Name
- Username
- Password

Assign

- Lessons
- Grades
- Classes

A teacher may teach multiple lessons across multiple classes.

Example

```
Teacher

Mathematics

Grade 1 Class 1
Grade 1 Class 3
Grade 2 Class 2
```

Each teacher receives an Access Code.

---

## Step 8

Finish Installation

The system generates access credentials for:

- Administrator
- Teachers
- Students
- Parents
- Consultants

The administrator is then redirected to the Login page.

---

# 🔐 Authentication

Login requires

- Username
- Password
- Access Code

The system automatically identifies the user's role and loads the appropriate dashboard.

---

# 💾 Database

The application uses **JSON files only**.

No SQL or NoSQL database is used.

```
database/

admin.json
teachers.json
books.json
grades.json
consultants.json
students.json
parents.json
ai-analysis.json
notes.json
```

---

# 🛠 Technology Stack

## Frontend

- React
- Vite
- TypeScript

## Backend

- Node.js
- Express
- TypeScript

## Database

- JSON Files

---

# ❌ Not Used

The project intentionally does **not** use:

- MySQL
- PostgreSQL
- SQLite
- MongoDB
- Firebase
- Supabase
- Prisma
- Redis
- Any ORM

---

# 🎯 Vision

School Intelligence Platform is designed to become more than a traditional school management system.

Its mission is to help schools make intelligent, data-driven decisions through predictive algorithms, educational analytics, and personalized recommendations, ultimately improving learning outcomes for students and providing better tools for administrators, teachers, consultants, and parents.