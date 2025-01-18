# Pet Step Backend

## About the Project

**Pet Step** was a personal project that was in production and served as the backend for two **React Native** applications: one for pet owners and another for dog walkers. The main goal of the platform was to connect dog owners with walkers, ensuring safety, convenience, and transparency during walks.

This backend was designed with a focus on scalability, security, and performance, utilizing modern technologies and hosted on AWS. Now, the project has been discontinued and is open-sourced for learning and reference purposes.

---

## Technologies Used

### Languages and Frameworks

- **TypeScript**
- **Node.js**
- **Express.js**
- **MongoDB**
  ß

### AWS Infrastructure

- **Amazon EC2**: Hosted the backend server on scalable instances.
- **Amazon S3**: Stored user profile images and documents.
- **Amazon SES**: Handled transactional emails, such as approval notifications and password reset emails.
- **Amazon CloudWatch**: Monitored application logs and metrics.
- **Amazon Route 53**: Managed DNS for the application domain.
- **Amazon Elastic Load Balancer**: Distributed traffic across multiple EC2 instances (when needed).
- **Amazon IAM**: Managed permissions and credentials for secure access to services.

### Other Technologies

- **Firebase**: Sent push notifications to mobile apps.
- **Stripe**: Integrated payments and managed dog walkers' bank accounts.
- **Docker**: Used for containerization in development and deployment environments.
- **Nginx**: Reverse proxy server.

---

## Backend Features

### Authentication and Users

- User registration and authentication for both pet owners and dog walkers.
- Email verification via **AWS SES**.
- Password encryption using **bcrypt**.

### Dog Walkers

- Registration and approval of walkers upon document submission.
- Real-time availability and location management.
- Rating system for walkers by pet owners after walks.

### Pet Owners

- Real-time walk requests.
- Walk tracking through real-time location updates.
- Walker evaluation system.

### Notifications

- Push notifications via **Firebase Cloud Messaging** (FCM).
- Automated emails for approval, rejection, and password reset.

### Payments

- Integrated with **Stripe** for payment processing.
- Managed dog walkers' bank accounts and payouts.

---

## Prerequisites

Before starting, ensure you have the following tools installed on your machine:

- **Node.js** (version 16 or higher)
- **Docker** (for running MongoDB locally, if needed)

---

## How to Run the Project

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/pet-step-server.git
cd pet-step-backend
```

### 2. Configure Environment Variables

Create the `.env` file:\*\* In the project's root directory, copy the `.env.example` file to create a new `.env` file

```bash
    cp .env.example .env
```

### 3. Install Dependencies

```bash
yarn install
```

### 4. Start Docker Containers

To run MongoDB locally:

```bash
docker-compose up -d
```

### 5. Run the Project

```bash
yarn run dev
```

The server will be available at (port 3000 as default): `http://localhost:3000`

---

## Project Structure

- **/src/controllers**: Controllers responsible for handling requests.
- **/src/repositories**: Data access and external service integration layer.
- **/src/utils**: Utility functions, such as email sending, notifications, and authentication.
- **/src/interfaces**: Type and interface definitions.
