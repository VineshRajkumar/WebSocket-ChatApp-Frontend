import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { LuSend, LuCopy } from "react-icons/lu";
import './App.css'
import { toast } from "sonner"
import { Toaster } from "@/components/ui/sonner"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useCallback, useEffect, useState } from "react";



function ChatComponent({ roomId, name, newuser, socket }: { roomId: string; name: string; newuser: number; socket: WebSocket | null }) {

  interface ChatMessage {
    success: boolean
    message: string
    type: string
    text: string
    sender: string
  }

  const [message, setMessage] = useState<string>('')
  const [users, setusers] = useState<Record<string, string[]>>();
  const [receivedMessages, setReceivedMessages] = useState<ChatMessage[]>([])


  const sendMessage = useCallback(() => {

    if (socket && socket.readyState === WebSocket.OPEN) {

      socket.send(JSON.stringify({ type: "chat", payload: { message: message, sender: name } }));

    } else {

      toast.error("Socket not open");

    }
    setMessage('')

  }, [message, name, socket])

  // console.log(receivedMessages)
  //when differemt people type the socket will change so that will rerender
  useEffect(() => {

    if (!socket) {
      toast.error("Socket is not connected.");
      return;
    }
    //when there is a message from server
    socket.onmessage = (e) => {

      const response = JSON.parse(e.data);

      if (response.type === "chat") {

        setReceivedMessages((prev) => ([...prev, response]))

      }
      if (response.type === "getusers") {
        setusers(response.users)
        toast(response.message)
      }



    }

    socket.onerror = (err) => {
      toast.error(`WebSocket error: ${err}`);
    };

  }, [socket])


  const copyToClipboard = () => {
    navigator.clipboard.writeText(roomId);
    toast("Room code copied to clipboard!");
  };



  return (
    <div className="flex justify-center items-center min-h-screen bg-white px-4">
      <Card className="w-full max-w-xl h-[600px] rounded-2xl shadow-md border border-gray-200 flex flex-col font-mono">
        <CardHeader className="space-y-1">
          <CardTitle className="text-xl flex items-center gap-2">
            💬 Real Time Chat
          </CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            temporary room that expires after all users exit
          </CardDescription>
          <div className="flex justify-between items-center bg-gray-100 p-2 rounded-md mt-2">
            <span className="text-sm">Room Code: <strong>{roomId}</strong></span>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" onClick={copyToClipboard}>
                <LuCopy className="w-4 h-4" />
              </Button>
              <span className="text-sm text-right">Users: {users?.[roomId]?.length ?? newuser}</span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex-1 mx-5 overflow-y-auto space-y-2 p-4 bg-white border rounded-md">
          {receivedMessages.map((item, index) =>
            item.sender === name ? (
              <div key={index} className="flex flex-col items-end">
                <div className="bg-black text-white rounded-2xl px-4 py-2 max-w-xs">
                  {item.text}
                </div>
              </div>
            ) : (
              <div key={index} className="flex flex-col items-start">
                <span className="text-xs text-muted-foreground mb-1">{item.sender}</span>
                <div className="bg-gray-200 text-black rounded-2xl px-4 py-2 max-w-xs">
                  {item.text}
                </div>
              </div>
            )
          )}
        </CardContent>

        <CardFooter className=" ">
          <div className="flex w-full gap-1">
            <Input
              type="text"
              placeholder="Type a message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="font-mono"
            />
            <Button onClick={sendMessage} className="bg-black text-white" size="icon">
              <LuSend className="h-4 w-4" />
            </Button>
          </div>
        </CardFooter>
        <Toaster />
      </Card>
    </div>
  );
}


function App() {

  type ServerResponse = {
    success: boolean;
    message: string;
    type: string;
    data: Record<string, string[]>
    roomId: string;
    name: string;
  };

  const [sender, setSender] = useState<string>('')
  const [roomId, setRoomId] = useState<string>('') //room id typed by user
  const [socket, setSocket] = useState<WebSocket | null>(null)
  const [data, setdata] = useState<ServerResponse | null>(null)
  const [generatedRoomId, setGeneratedRoomId] = useState<string>('') //room id we generated

  const createRoom = useCallback(() => {

    if (!socket) {
      toast.error("Socket is not connected.");
      return;
    }

    const generateRoomId = 'room' + Math.floor(Math.random() * 100).toString()


    socket?.send(JSON.stringify({ type: "save", payload: { roomId: generateRoomId } }))

  }, [socket])

  const handleRoomJoining = useCallback((e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!socket) {
      toast.error("Socket is not connected.");
      return;
    }

    socket?.send(JSON.stringify({ type: "join", payload: { roomId: roomId, sender: sender } }))

  }, [roomId, sender, socket])

  //when there is a message from server :- 
  useEffect(() => {
    if (!socket) return

    socket.onmessage = (event) => {

      const response = JSON.parse(event.data);
      // console.log(response)

      if (response.type === "roomCreated") {

        if (response.success === true) {

          setGeneratedRoomId(response.roomId)
          // console.log("Room created successfully:", response);

        } else {
          toast.error("Room creation failed");
        }
      }

      if (response.type === "joined") {
        if (response.success === false) {
          toast.error(response.message);
        } else {
          setdata(response)
          // console.log(response);
        }
      }
      toast(response.message)
    };

    socket.onerror = (err) => {
      toast.error(`WebSocket error: ${err}`);
    };

    return () => {
      socket.close();
    }

  }, [socket])

  // console.log(socket)

  //on first render create socket connection
  useEffect(() => {
    const ws = new WebSocket(import.meta.env.VITE_WEBSOCKET_URL)
    setSocket(ws)

    return () => {
      ws.close()
    }
  }, [])





  return data?.roomId == null ? (
    <div className="flex justify-center items-center min-h-screen bg-white px-4">
      <Card className="w-full max-w-md p-6 shadow-md border border-gray-200 rounded-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-mono flex items-center justify-center gap-2">
            💬 Real Time Chat
          </CardTitle>
          <CardDescription className="font-mono text-sm mt-2">
            temporary room that expires after all users exit
          </CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col gap-4 mt-4">
          <Button
            className="w-full bg-black text-white font-mono text-lg"
            onClick={createRoom}
          >
            Create New Room
          </Button>

          <form onSubmit={handleRoomJoining} className="flex flex-col gap-3">
            <Input
              type="text"
              placeholder="Enter your name"
              value={sender}
              onChange={(e) => setSender(e.target.value)}
              className="font-mono"
            />
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="Enter Room Code"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                className="font-mono flex-1"
              />
              <Button
                type="submit"
                className="bg-black text-white font-mono"
              >
                Join Room
              </Button>
            </div>
          </form>
        </CardContent>

        {generatedRoomId && (
          <CardFooter className="mt-4 flex justify-center">
            <div className="bg-gray-100 border rounded-xl shadow p-4 text-center font-mono w-full">
              <div className="text-sm">Your Room Code:</div>
              <div className="text-2xl font-bold mt-1">{generatedRoomId}</div>
            </div>
          </CardFooter>
        )}
        <Toaster />
      </Card>

    </div>

  ) : (
    <ChatComponent
      roomId={data.roomId}
      name={data.name || ""}
      newuser={data.data[roomId].length}
      socket={socket}
    />
  );
}

export default App
