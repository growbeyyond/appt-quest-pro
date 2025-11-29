import DashboardLayout from "@/components/DashboardLayout";
import { CheckInQueue } from "@/components/CheckInQueue";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Queue() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Check-In Queue</h1>
          <p className="text-muted-foreground mt-2">
            Manage patients who have checked in and are waiting for consultation
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Today's Queue</CardTitle>
            <CardDescription>
              Patients checked in and waiting for consultation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CheckInQueue />
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
