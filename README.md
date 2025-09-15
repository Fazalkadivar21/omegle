
# Omegle Clone

This project is a simplified clone of Omegle, a web application that allows users to chat with random strangers. This document explains how the project works from a high-level perspective.

## How it Works

The project is divided into two main parts: the **frontend** (what you see in your browser) and the **backend** (the server that powers the application).

### The Backend

The backend is the heart of the application, responsible for connecting users and enabling them to communicate. Here's a step-by-step breakdown of what happens:

1.  **A User Connects:** When you open the website, your browser establishes a connection with the backend server.

2.  **Joining a Queue:** You can choose between two types of chat: text chat or video chat.
    *   If you choose **text chat**, you are added to a "text chat queue."
    *   If you choose **video chat**, you are added to a "video chat queue."
    A queue is simply a waiting list of users who are looking for a chat partner.

3.  **Finding a Match:** The backend constantly checks the queues. If there are two or more people in a queue, it takes the first two people and "matches" them.

4.  **Creating a Room:** Once a match is found, the backend creates a virtual "chat room" for the two users. This room is just a private space for them to communicate.

5.  **Starting the Chat:**
    *   **For text chat:** The two users can now send and receive text messages. The backend relays the messages between them.
    *   **For video chat:** This is a bit more complex. The backend helps the two users' browsers establish a direct **peer-to-peer (P2P)** connection. This means that the video and audio data flows directly between the two users, without passing through the server. This is more efficient and provides better quality. The backend's role is to help with the initial "handshake" to set up this connection.

6.  **Handling Disconnections:** If one user disconnects or skips the chat, the backend notifies the other user and puts them back in the queue to find a new chat partner.

### The Frontend

The frontend is what you interact with in your browser. It's responsible for:

1.  **Displaying the User Interface:** This includes the buttons to start a chat, the chat window itself, and the video feeds.

2.  **Connecting to the Backend:** The frontend establishes and maintains the connection with the backend server.

3.  **Sending and Receiving Messages:**
    *   **For text chat:** When you type a message and hit "send," the frontend sends it to the backend, which then forwards it to the other user. When you receive a message, the frontend displays it in the chat window.
    *   **For video chat:** The frontend handles the complex process of setting up the peer-to-peer connection with the other user's browser, with the help of the backend. It also displays your own video feed and the other user's video feed.

4.  **User Actions:** The frontend allows you to perform actions like skipping a chat, muting your microphone, or turning off your camera.

## In a Nutshell

Think of the backend as a matchmaker. It finds people who want to chat and introduces them to each other. Once the introduction is made, the two people can talk directly (in the case of video chat) or with the backend's help (in the case of text chat). The frontend is the window through which you see and interact with all of this.
