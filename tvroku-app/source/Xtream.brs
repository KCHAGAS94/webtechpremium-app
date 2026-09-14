function HttpGetJson(url as string) as dynamic
    xfer = CreateObject("roUrlTransfer")
    xfer.SetCertificatesFile("common:/certs/ca-bundle.crt")
    xfer.InitClientCertificates()
    ' Same UA used by mobile/src/utils/xtream-api.ts and playlist-loader.ts —
    ' some providers block requests without a recognized player User-Agent.
    xfer.AddHeader("User-Agent", "VLC/3.0.18 LibVLC/3.0.18")
    xfer.SetUrl(url)
    code = xfer.GetToString()
    if code = invalid or code = ""
        return invalid
    end if
    return ParseJson(code)
end function

' Extracts { baseUrl, username, password } from a get.php-style playlist URL,
' mirroring mobile/src/utils/xtream-api.ts's parseXtreamCredentials.
function ParseXtreamCredentials(playlistUrl as string) as dynamic
    if playlistUrl = invalid or playlistUrl = "" then return invalid

    schemeSplit = playlistUrl.Split("://")
    if schemeSplit.Count() < 2 then return invalid
    scheme = schemeSplit[0]
    rest = schemeSplit[1]

    querySplit = rest.Split("?")
    host = querySplit[0].Split("/")[0]
    if querySplit.Count() < 2 then return invalid

    query = querySplit[1]
    params = {}
    for each pair in query.Split("&")
        kv = pair.Split("=")
        if kv.Count() = 2
            params[LCase(kv[0])] = kv[1]
        end if
    end for

    username = params["username"]
    password = params["password"]
    if username = invalid or password = invalid then return invalid

    return {
        baseUrl: scheme + "://" + host
        username: username
        password: password
    }
end function

function XtreamUrl(creds as object, action as string) as string
    return creds.baseUrl + "/player_api.php?username=" + creds.username + "&password=" + creds.password + "&action=" + action
end function

function StreamUrl(creds as object, kind as string, streamId as dynamic, ext as string) as string
    id = streamId.ToStr()
    if ext = invalid or ext = "" then ext = "m3u8"
    return creds.baseUrl + "/" + kind + "/" + creds.username + "/" + creds.password + "/" + id + "." + ext
end function
