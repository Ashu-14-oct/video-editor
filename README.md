# Video Editor API

This is a Node.js-based API for a video editor application. It provides endpoints for user authentication and video management.

## Table of Contents

- [Installation](#installation)
- [Usage](#usage)
- [API Endpoints](#api-endpoints)
  - [User Routes](#user-routes)
  - [Video Routes](#video-routes)
- [Contributing](#contributing)
- [License](#license)

## Installation

1. Clone the repository:
    ```sh
    git clone https://github.com/Ashu-14-oct/video-editor.git
    cd video-editor
    ```

2. Install dependencies:
    ```sh
    npm install
    ```

3. Create the necessary JSON files for storing data:
    ```sh
    touch users.json sessions.json videos.json
    ```

4. Start the server:
    ```sh
    npm start
    ```

## Usage

Once the server is running, you can use tools like Postman or curl to interact with the API endpoints.

## API Endpoints

### User Routes

- **POST /api/login**: Log a user in and give them a token.
- **DELETE /api/logout**: Log a user out.
- **GET /api/user**: Send user info.
- **PUT /api/user**: Update user info.

### Video Routes

- **GET /api/videos**: Get a list of videos.
- **GET /api/videos-temp**: Get a temporary list of videos.
- **POST /api/upload-video**: Upload a new video.
- **GET /get-video-asset**: Get a video asset.
- **PATCH /api/video/extract-audio**: Extract audio from a video.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request for any changes.