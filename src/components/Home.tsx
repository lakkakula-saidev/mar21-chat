import { useState, useEffect, ChangeEvent, FormEvent } from "react";
import { Container, Col, Row, Form, ListGroup, Button } from "react-bootstrap";
import { Room, Message, User, currentUser } from "../typings/interfaces";
import { io } from "socket.io-client";

const ADDRESS = "http://localhost:3050";
const socket = io(ADDRESS, { transports: ["websocket"] });
// this is the socket initialization
// socket -> it's our connection to the server

const Home = () => {
    const [userName, setUserName] = useState("");
    const [currentMessage, setCurrentMessage] = useState("");
    const [onlineUsers, setOnlineUsers] = useState<User[]>([]);
    const [chatHistory, setChatHistory] = useState<Message[]>([]);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [room, setRoom] = useState<string>("Testing");
    const [recipent, setRecipent] = useState<string>("");
    const [currentUser, setCurrentUser] = useState<currentUser>({ name: "", _id: "", socketId: "" });

    const checkOnlineUsers = async () => {
        try {
            console.log("I am here");
            const response = await fetch(ADDRESS + "/online-users", { method: "GET" });
            const users = await response.json();
            console.log("users", users);
            setOnlineUsers(users.onlineUsers);
        } catch (error) {
            console.log(error);
        }
    };

    useEffect(() => {
        // this is happening just once
        // but I'm setting up event listeners just once!
        // they will live for the lifetime of the chat

        console.log("I'm setting the event listeners!");

        socket.on("connect", () => {
            // with on we're listening for an event
            console.log(socket.id);
        });

        socket.on("loggedin", () => {
            console.log("Now you're successfully logged in!");
            setIsLoggedIn(true);
            checkOnlineUsers();
        });

        socket.on("onlineUsersUpdate", (body) => {
            /*  checkOnlineUsers(); */
            setOnlineUsers(body);
        });

        socket.on("newConnection", () => {
            console.log("newConnection event, someone got in!");
            checkOnlineUsers();
        });

        socket.on("createRoom", async (temp) => {
            console.log("newChat event, New room to be created!", temp.recipent);
            let body = { name: temp.message.id + temp.message.sender, users: [temp.message.id, temp.recipent] };
            let response = await fetch(`${ADDRESS}/room`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(body)
            });
            let newPayload = { message: temp.message, recipent: temp.recipent };
            socket.emit("sendMessage", newPayload);
            /* checkOnlineUsers(); */
        });

        socket.on("message", (message: Message) => {
            console.log("..........");
            setChatHistory((oldChatHistory) => [...oldChatHistory, message]);
        });

        return () => {
            console.log("Disconnecting...");
            socket.disconnect();
        };
    }, []);

    const getChatHistory = async (room: Room | string) => {
        const response = await fetch(`${ADDRESS}/room/${room}`);

        const { chatHistory } = await response.json();

        setChatHistory(chatHistory);
    };

    const handleUsernameSubmit = async (e: FormEvent) => {
        e.preventDefault();
        const response = await fetch(ADDRESS + "/user", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ name: userName, socketId: socket.id })
        });
        const curUser = await response.json();

        setCurrentUser(curUser);
        socket.emit("setUsername", { body: curUser });

        /* getChatHistory(room); */
        // with emit we're sending an event to the server
        // now the server is allowing us to send messages
        // and will emit an event for us! it's called 'loggedin'
    };

    const sendMessage = async (e: FormEvent) => {
        e.preventDefault();
        const messageToSend = {
            text: currentMessage,
            id: currentUser?._id,
            sender: currentUser?.name,
            timestamp: Date.now()
        };
        const temp = { message: messageToSend, recipent: recipent };
        socket.emit("sendMessage", temp);

        setChatHistory([...chatHistory, messageToSend]);
        setCurrentMessage("");
    };

    // applications loads, I establish the connection with the server, I receive a "connect" event
    // I set my username and I send a 'setUsername' event to the server
    // If the server accepts it, it will store my user into the connected users list
    // at that point, after setting it, it will emit for me a 'loggedin' event
    // If me, the client, receives the loggedin event, it means now I'm officially logged in
    // also on the server, and now I'm allowed to send messages (because I have a username)

    // 1) how to send messages?
    // 2) how to gracefully disconnect

    /*  const toggleRoom = () => {
        setRoom((r) => (r === recipent ? recipent : r === "red" ? "red" : "blue"));
    }; */

    return (
        <Container fluid className="px-4">
            <Row className="my-3" style={{ height: "95vh" }}>
                <Col md={10} className="d-flex flex-column justify-content-between">
                    {/* MAIN CHAT VIEW */}
                    <Form onSubmit={handleUsernameSubmit} className="d-flex">
                        <Form.Control placeholder="Insert your name" value={userName} disabled={isLoggedIn} onChange={(e: ChangeEvent<HTMLInputElement>) => setUserName(e.target.value)} />
                        {/* <Button className="ml-2" variant={room === "blue" ? "primary" : "danger"} onClick={!isLoggedIn ? toggleRoom : () => {}}>
                            Room
                        </Button> */}
                    </Form>
                    <ul>
                        {chatHistory.map((message) => (
                            <li key={message.id} className="my-2">
                                <strong>{message.sender}</strong>
                                <span className="mx-1"> | </span>
                                <span>{message.text}</span>
                                <span className="ml-2" style={{ fontSize: "0.7rem" }}>
                                    {new Date(message.timestamp).toLocaleTimeString("en-US")}
                                </span>
                            </li>
                        ))}
                    </ul>
                    <Form onSubmit={sendMessage}>
                        <Form.Control placeholder="Write a message" value={currentMessage} disabled={!isLoggedIn} onChange={(e: ChangeEvent<HTMLInputElement>) => setCurrentMessage(e.target.value)} />
                    </Form>
                </Col>
                <Col md={2} style={{ borderLeft: "2px solid black" }}>
                    {/* CONNECTED USERS */}
                    <div>Connected users</div>
                    <ListGroup>
                        {onlineUsers
                            .filter((u) => u.id !== currentUser?._id /* && u.room === room */)
                            .map((user) => (
                                <ListGroup.Item className="cursor-pointer" style={{ borderColor: recipent === user.id ? "green" : "none" }} onClick={() => setRecipent(user.id)} key={user.id}>
                                    {user.username}
                                </ListGroup.Item>
                            ))}
                    </ListGroup>
                </Col>
            </Row>
        </Container>
    );
};

export default Home;
