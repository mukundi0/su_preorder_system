import { Outlet } from "react-router-dom"
import StudentNavbar from "../components/StudentNavbar"

function StudentLayout() {
  return (
    <>
        <StudentNavbar />
        <Outlet />
    </>
  )
}

export default StudentLayout