import DashboardTemplate from "../components/DashboardTemplate"
import TimerAlert from "../components/TimerAlert"
export default function DashboardEstudiante(){
    return (
        <DashboardTemplate title="Panel de estudiante">
            <h1>Hola</h1>
            <TimerAlert />
        </DashboardTemplate>
    )
}