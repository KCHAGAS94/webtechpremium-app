sub init()
    m.top.functionName = "executeTask"
end sub

sub executeTask()
    mac = m.top.mac

    devices = HttpGetJson(PanelApiBaseUrl() + "/devices?mac=" + mac)
    if devices = invalid or type(devices) <> "roArray" or devices.Count() = 0
        status = HttpGetJson(PanelApiBaseUrl() + "/app/device-status?mac=" + mac)
        if status <> invalid and status.expirado = true
            m.top.status = "expired"
        else
            m.top.status = "no-playlist"
        end if
        return
    end if

    playlist = devices[0]
    creds = ParseXtreamCredentials(playlist.url)
    if creds = invalid
        m.top.status = "error"
        return
    end if

    liveCategories = HttpGetJson(XtreamUrl(creds, "get_live_categories"))
    liveStreams = HttpGetJson(XtreamUrl(creds, "get_live_streams"))
    vodCategories = HttpGetJson(XtreamUrl(creds, "get_vod_categories"))
    vodStreams = HttpGetJson(XtreamUrl(creds, "get_vod_streams"))
    seriesCategories = HttpGetJson(XtreamUrl(creds, "get_series_categories"))
    series = HttpGetJson(XtreamUrl(creds, "get_series"))

    if liveCategories = invalid and vodCategories = invalid and seriesCategories = invalid
        m.top.status = "error"
        return
    end if

    root = CreateObject("roSGNode", "ContentNode")
    root.AddFields({ xtBaseUrl: creds.baseUrl, xtUsername: creds.username, xtPassword: creds.password })

    liveSection = CreateObject("roSGNode", "ContentNode")
    liveSection.Title = "live"
    AppendCategoryRows(liveSection, liveCategories, liveStreams, creds, "live")
    root.AppendChild(liveSection)

    vodSection = CreateObject("roSGNode", "ContentNode")
    vodSection.Title = "vod"
    AppendCategoryRows(vodSection, vodCategories, vodStreams, creds, "movie")
    root.AppendChild(vodSection)

    seriesSection = CreateObject("roSGNode", "ContentNode")
    seriesSection.Title = "series"
    AppendSeriesRows(seriesSection, seriesCategories, series)
    root.AppendChild(seriesSection)

    m.top.catalog = root
    m.top.status = "ok"
end sub

sub AppendCategoryRows(section as object, categories as dynamic, streams as dynamic, creds as object, kind as string)
    if categories = invalid or streams = invalid then return

    for each category in categories
        row = CreateObject("roSGNode", "ContentNode")
        row.Title = category.category_name

        itemCount = 0
        for each stream in streams
            if stream.category_id = category.category_id
                item = CreateObject("roSGNode", "ContentNode")
                item.Title = stream.name
                if stream.stream_icon <> invalid then item.HDPosterUrl = stream.stream_icon
                ext = ""
                if kind = "movie" and stream.container_extension <> invalid then ext = stream.container_extension
                item.Url = StreamUrl(creds, kind, stream.stream_id, ext)
                row.AppendChild(item)
                itemCount++
            end if
        end for

        if itemCount > 0 then section.AppendChild(row)
    end for
end sub

' Series items carry a SeriesId instead of a playable Url — episodes are only
' known after a per-show get_series_info call (see SeriesInfoTask), same as
' mobile/src/utils/xtream-api.ts's approach.
sub AppendSeriesRows(section as object, categories as dynamic, series as dynamic)
    if categories = invalid or series = invalid then return

    for each category in categories
        row = CreateObject("roSGNode", "ContentNode")
        row.Title = category.category_name

        itemCount = 0
        for each show in series
            if show.category_id = category.category_id
                item = CreateObject("roSGNode", "ContentNode")
                item.Title = show.name
                if show.cover <> invalid then item.HDPosterUrl = show.cover
                item.AddFields({ SeriesId: show.series_id.ToStr() })
                row.AppendChild(item)
                itemCount++
            end if
        end for

        if itemCount > 0 then section.AppendChild(row)
    end for
end sub
