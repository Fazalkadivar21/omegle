import { NavLink } from "react-router"

const App = () => {
  return (
    <div className="bg-[beige] w-screen h-screen flex items-center justify-center gap-5">
      <NavLink to="/chat" className="border-2 border-black p-2 bg-black text-white rounded-4xl px-5 hover:rounded-full">Text Chat</NavLink>
      <NavLink to="/vc" className="border-2 border-black p-2 bg-black text-white rounded-4xl px-5 hover:rounded-full">Video Chat</NavLink>
    </div>
  )
}

export default App