import { NextResponse, type NextRequest } from "next/server";
export function middleware(request: NextRequest) {
  if (
    !/^[a-f0-9]{64}$/.test(
      request.cookies.get("inventory-demo-session")?.value ?? "",
    )
  ) {
    const destination = request.nextUrl.clone();
    destination.host = request.headers.get("host") ?? destination.host;
    destination.pathname = "/api/demo/start";
    destination.search = "";
    const response = NextResponse.redirect(destination);
    response.headers.set("Cache-Control", "no-store");
    return response;
  }
  return NextResponse.next();
}
export const config = {
  matcher: ["/", "/dashboard/:path*", "/inventory/:path*", "/requests/:path*"],
};
