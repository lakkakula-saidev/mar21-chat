export type Room = "red" | "blue"

export interface currentUser {
  name: string
  _id: string
  socketId: string

}

export interface User {
  username: string
  id: string
  socketId: string
}


export interface Message {
  text: string
  id: string
  sender: string
  timestamp: number
}

// Date.now()
