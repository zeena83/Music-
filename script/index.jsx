/*jshint esnext: true, moz: true*/
/*jslint browser:true */
/*global firebase, React, React.Component, fetch, console, ReactDOM */

//======================================================
//CLASSES

class App extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            loggedIn: false,
            user: {
                name: '',
                photo: '',
                uid: ''
            },
            results: [],
            headerAction: '',
            favorites: [],
            originalFavorites: [],
            favoritesFilter: '',
            bioName: "",
            bioSimilar: [],
            bioSummary: "",
            bioImg: "",
            bioDone: false,
            searchVal: "",
            radioVal: "track",
            album: {albumTracks: [""]},
            toggleProfile: false,
            bioDisplay: false,
            searchDisplay: false,
            albumDisplay: false,
            playingSong: '',
            statusMessage: '',
            statusCode: ''
        };

        this.handleLogIn = this.handleLogIn.bind(this);
        this.handleLogOut = this.handleLogOut.bind(this);
        this.handleFavorites = this.handleFavorites.bind(this);
        this.closeFavorites = this.closeFavorites.bind(this);
        this.removeFavorite = this.removeFavorite.bind(this);
        this.filterFavorites = this.filterFavorites.bind(this);
        this.sortFavorites = this.sortFavorites.bind(this);
        this.findResults = this.findResults.bind(this);
        this.getArtistBio = this.getArtistBio.bind(this);
        this.getQuotes = this.getQuotes.bind(this);
        this.sendToFavorites = this.sendToFavorites.bind(this);
        this.searchInput = this.searchInput.bind(this);
        this.searchType = this.searchType.bind(this);
        this.sortSearch = this.sortSearch.bind(this);
        this.getAlbumTracks = this.getAlbumTracks.bind(this);
        this.spotifyPreview = this.spotifyPreview.bind(this);
        this.toggleProfile = this.toggleProfile.bind(this);
        this.stopPreview = this.stopPreview.bind(this);
        this.closeBio = this.closeBio.bind(this);
        this.closeAlbum = this.closeAlbum.bind(this);
        this.statusChange = this.statusChange.bind(this);
    }

    handleLogIn() {
        const provider = new firebase.auth.GithubAuthProvider();

        firebase.auth().signInWithPopup(provider).then(result => {
            let user = result.user;
            this.setState({
                loggedIn: true,
                user: {
                    name: user.displayName,
                    photo: user.photoURL,
                    uid: user.uid
                }
            });
            this.statusChange('success', 'You successfully logged in!');
        }).catch(error => {
            console.log(error);
            this.statusChange('error', 'Something went wrong, try again.');
        });
    }

    handleLogOut() {
        firebase.auth().signOut().then(() => {
            this.setState({
                loggedIn: false
            });
            this.statusChange('success', 'You successfully logged out!');
        }).catch(error => {
            console.log(error);
            this.statusChange('error', 'Something went wrong, try again.');
        });
    }

    //BIOGRAPHY
    getArtistBio(e) {
        let artist = e.target.textContent;
        let url = `http://ws.audioscrobbler.com/2.0/?method=artist.getinfo&artist=${artist}&api_key=b971e5066edbb8974e0bb47164fd33a4&format=json`;

        fetch(url)
            .then((response) => {
                this.setState({bioDone: false});
                return response.json();
            })
            .then((result) => {
                console.log(result);
                let art = result.artist;
                let summary = art.bio.summary;
                let img = art.image.length > 0 ? art.image[1]["#text"] : "";
                let similar = art.similar.artist;
                let name = art.name;
                let similarNames = [];

                for (let x = 0; x < similar.length; x++) {
                    similarNames.push({name: similar[x].name, url: similar[x].url});
                }

                this.setState({
                    bioName: name,
                    bioImg: img,
                    bioSimilar: similarNames,
                    bioSummary: summary,
                    bioDone: true,
                    bioDisplay: true
                });
            });
    }

    //SENDTOFAVORITES
    sendToFavorites(e) {
        let par = e.target.parentNode.parentNode;
        let track = par.children[0].textContent;
        let artist = par.children[1].textContent;
        let album = par.children[2].textContent;
        let spotify = par.children[3].attributes['data-link'].value;
        let preview = par.children[4].attributes['data-preview'].value;
        let duplicate = false;

        let uid = this.state.user.uid;

        const database = firebase.database();
        //LÄSA DATA FRÅN DATABASEN
        database.ref('users/' + this.state.user.uid + '/favorites/').on('value', snapshot => {
            let data = snapshot.val();
            let allFavorites = [];
            for (let favorite in data) {
                allFavorites.push({
                    track: data[favorite].track,
                    album: data[favorite].album,
                    artist: data[favorite].artist,
                    spotify: data[favorite].spotify,
                    preview: data[favorite].preview,
                    id: favorite
                });
            }
            this.setState({
                favorites: allFavorites,
                originalFavorites: allFavorites
            });
        });

        this.state.originalFavorites.map(song => {
            if (track === song.track && artist === song.artist && album === song.album) {
                duplicate = true;
            }
        });

        if (!duplicate) {
            database.ref('users/' + uid + '/favorites/').push({
                track: track,
                album: album,
                artist: artist,
                spotify: spotify,
                preview: preview
            });

            this.setState({addSucess: true});
            this.statusChange('success', 'Your song was added to your favorites.');
        } else {
            this.setState({addSucess: false});
            this.statusChange('error', 'You already have this song in your favorites.');
        }

    }

    //HANDLE FAVORITES
    handleFavorites() {
        this.setState({
            headerAction: 'favorites'
        });

        const database = firebase.database();
        //LÄSA DATA FRÅN DATABASEN
        database.ref('users/' + this.state.user.uid + '/favorites/').on('value', snapshot => {
            let data = snapshot.val();
            let allFavorites = [];
            for (let favorite in data) {
                allFavorites.push({
                    track: data[favorite].track,
                    album: data[favorite].album,
                    artist: data[favorite].artist,
                    spotify: data[favorite].spotify,
                    preview: data[favorite].preview,
                    id: favorite
                });
            }
            this.setState({
                favorites: allFavorites,
                originalFavorites: allFavorites
            });
        });
    }


    //CLOSE FAVORITES
    closeFavorites() {
        this.setState({
            headerAction: ''
        });
    }

    //REMOVE FAVORITES
    removeFavorite(event) {
        let targetId = event.target.parentNode.parentNode.attributes['data-id'].value;
        const database = firebase.database();
        database.ref('users/' + this.state.user.uid + '/favorites/' + targetId).set(null);
        this.statusChange('success', 'Your song was removed from your favorites.');
    }

    //FILTER FAVORITES
    filterFavorites(event) {
        this.setState({
            filterFavorites: event.target.value
        });

        let allFavorites = this.state.originalFavorites;
        let filteredList = [];
        allFavorites.filter(obj => {
            if (obj.track.toLowerCase().indexOf(event.target.value.toLowerCase()) > -1 ||
                obj.artist.toLowerCase().indexOf(event.target.value.toLowerCase()) > -1 ||
                obj.album.toLowerCase().indexOf(event.target.value.toLowerCase()) > -1) {
                filteredList.push(obj);
            }
        });
        this.setState({
            favorites: filteredList
        });
    }

    // SORT FAVORITS
    sortFavorites(event) {
        let target;
        let targetElement;
        if (event.target.attributes['data-sort'] === undefined) {
            target = event.target.parentNode.attributes['data-sort'].value;
            targetElement = event.target.parentNode;
        } else {
            target = event.target.attributes['data-sort'].value;
            targetElement = event.target;
        }

        let allTableHeaders = document.getElementsByTagName('th');

        for (let i = 0; i < allTableHeaders.length; i++) {
            if (allTableHeaders[i] !== targetElement) {
                allTableHeaders[i].removeAttribute('class');
            }
        }
        targetElement.className = 'bold';


        let getFavorites = this.state.favorites;
        if (target === 'track') {
            getFavorites.sort((a, b) => {
                let aTrack = a.track.toLowerCase();
                let bTrack = b.track.toLowerCase();
                if (aTrack < bTrack) {
                    return -1;
                }
                if (aTrack > bTrack) {
                    return 1;
                }

                return 0;
            });
            this.setState({
                favorites: getFavorites
            });
        } else if (target === 'artist') {
            getFavorites.sort((a, b) => {
                let aArtist = a.artist.toLowerCase();
                let bArtist = b.artist.toLowerCase();
                if (aArtist < bArtist) {
                    return -1;
                }
                if (aArtist > bArtist) {
                    return 1;
                }
                return 0;
            });
            this.setState({
                favorites: getFavorites
            });
        } else if (target === 'album') {
            getFavorites.sort((a, b) => {
                let aAlbum = a.album.toLowerCase();
                let bAlbum = b.album.toLowerCase();
                if (aAlbum < bAlbum) {
                    return -1;
                }
                if (aAlbum > bAlbum) {
                    return 1;
                }
                return 0;
            });
            this.setState({
                favorites: getFavorites
            });
        } else if (target === 'default') {
            this.handleFavorites();
        }
    }

    toggleProfile() {
        console.log('hi');
        this.setState({
            toggleProfile: !this.state.toggleProfile
        });
    }

    //COMPONENT DID MOUNT
    componentDidMount() {
        console.log('mount');
        //find quote
        this.getQuotes();

        let _this = this;
        firebase.auth().onAuthStateChanged(user => {
            if (user) {
                _this.setState({
                    loggedIn: true,
                    user: {
                        name: user.displayName,
                        photo: user.photoURL,
                        uid: user.uid
                    }
                });

                //läs in data direkt så jag har något att jämföra emot om man inte öppnar favoriter först
                const database = firebase.database();
                database.ref('users/' + this.state.user.uid + '/favorites/').once('value', snapshot => {
                    console.log('firebase mount');
                    let data = snapshot.val();
                    let allFavorites = [];
                    for (let favorite in data) {
                        allFavorites.push({
                            track: data[favorite].track,
                            album: data[favorite].album,
                            artist: data[favorite].artist,
                            spotify: data[favorite].spotify,
                            preview: data[favorite].preview,
                            id: favorite
                        });
                    }

                    this.setState({
                        favorites: allFavorites,
                        originalFavorites: allFavorites
                    });
                });
            } else {
                // User is signed out.
                // ...
            }
        });
    }


    //GETQOUTES
    getQuotes() {

        let url = `http://quotes.rest/qod.json?category=inspire`;

        fetch(url)
            .then((response) => {
                return response.json();
            })
            .then((result) => {

                let quote = result.contents.quotes[0];
                let title = quote.title;
                let author = quote.author;
                let quoteContent = quote.quote;

                this.setState({
                    quoteTitle: title,
                    quoteAuthor: author,
                    quote: quoteContent
                });

            });

    }

    //SORTSEARCH
    sortSearch(event) {
        let target;
        let targetElement;
        if (event.target.attributes['data-sort'] === undefined) {
            target = event.target.parentNode.attributes['data-sort'].value;
            targetElement = event.target.parentNode;
        } else {
            target = event.target.attributes['data-sort'].value;
            targetElement = event.target;
        }

        let allTableHeaders = document.getElementsByTagName('th');

        for (let i = 0; i < allTableHeaders.length; i++) {
            if (allTableHeaders[i] !== targetElement) {
                allTableHeaders[i].removeAttribute('class');
            }
        }
        targetElement.className = 'bold';

        let getResults = this.state.results;
        if (target === 'track') {
            getResults.sort((a, b) => {
                let aTrack = a.track.toLowerCase();
                let bTrack = b.track.toLowerCase();
                if (aTrack < bTrack) {
                    return -1;
                }
                if (aTrack > bTrack) {
                    return 1;
                }

                return 0;
            });
            this.setState({
                results: getResults
            });
        } else if (target === 'artist') {
            getResults.sort((a, b) => {
                let aArtist = a.artist.toLowerCase();
                let bArtist = b.artist.toLowerCase();
                if (aArtist < bArtist) {
                    return -1;
                }
                if (aArtist > bArtist) {
                    return 1;
                }
                return 0;
            });
            this.setState({
                results: getResults
            });
        } else if (target === 'album') {
            getResults.sort((a, b) => {
                let aAlbum = a.album.toLowerCase();
                let bAlbum = b.album.toLowerCase();
                if (aAlbum < bAlbum) {
                    return -1;
                }
                if (aAlbum > bAlbum) {
                    return 1;
                }
                return 0;
            });
            this.setState({
                results: getResults
            });
        }
    }

    //FINDRESULTS
    findResults(event) {
        if (event !== undefined) {
            if (event.target.previousSibling.value.length === 0) {
                event.preventDefault();
                return;
            }
        }

        if (stopSong !== undefined) {
            clearTimeout(stopSong);
        }
        if (this.state.playing !== undefined && this.state.playing !== null) {
            this.state.playing.pause();
            this.setState({
                playingSong: ''
            });
        }

        let searchType = this.state.radioVal;
        let title = "";
        let artist = "";
        let album = "";
        let cover = "";
        let resultTable = [];
        let preview = "";
        let openSpotify = "";

        let url = `https://api.spotify.com/v1/search?q=${this.state.searchVal}&type=${searchType}&limit=5`;

        fetch(url)
            .then((response) => {
                return response.json();
            })
            .then((result) => {

                //Track
                if (searchType === "track") {

                    let tracks = result.tracks.items;

                    for (let i = 0; i < tracks.length; i++) {
                        title = tracks[i].name;
                        artist = tracks[i].artists[0].name;
                        album = tracks[i].album.name;
                        preview = tracks[i].preview_url;
                        openSpotify = tracks[i].external_urls.spotify;

                        let obj = {
                            openSpotify: openSpotify,
                            preview: preview,
                            searchType: searchType,
                            track: title,
                            artist: artist,
                            album: album
                        };

                        resultTable.push(obj);

                    }

                }
                //Artist
                else if (searchType === "artist") {
                    let artists = result.artists.items;

                    for (let i = 0; i < artists.length; i++) {
                        artist = artists[i].name;
                        openSpotify = artists[i].external_urls.spotify;

                        if (artists[i].images.length !== 0) {
                            cover = artists[i].images[0].url;
                        }

                        let obj = {
                            openSpotify: openSpotify,
                            searchType: searchType,
                            cover: cover,
                            artist: artist
                        };
                        resultTable.push(obj);
                    }


                }
                //Album
                else if (searchType === "album") {
                    let albums = result.albums.items;


                    for (let i = 0; i < albums.length; i++) {
                        artist = albums[i].artists[0].name;
                        album = albums[i].name;
                        openSpotify = albums[i].external_urls.spotify;

                        if (albums[i].images.length !== 0) {
                            cover = albums[i].images[0].url;
                        }
                        let obj = {
                            openSpotify: openSpotify,
                            searchType: searchType,
                            cover: cover,
                            artist: artist,
                            album: album
                        };
                        resultTable.push(obj);
                    }

                }


                this.setState({
                    results: resultTable,
                    searchDisplay: true
                });
            });
    }//END FINDRESULTS

    //SEARCH INPUT
    searchInput(e) {
        if (e.key === 'Enter') {
            if (e.target.value.length === 0) {
                e.preventDefault();

            } else {
                this.findResults();
            }
        } else {
            let val = e.target.value;
            this.setState({searchVal: val});
        }
    }

    //SEARCHTYPE
    searchType(e) {
        let val = e.target;
        this.setState({
            radioVal: val.value,
            checked: true
        });
    }

    //GET ALBUM TRACKS
    getAlbumTracks(e) {
        let res = e.target.parentNode;
        let album = encodeURIComponent(res.children[2].textContent);
        let artist = encodeURIComponent(res.children[1].textContent);

        let url = `http://ws.audioscrobbler.com/2.0/?method=album.getinfo&api_key=b971e5066edbb8974e0bb47164fd33a4&artist=${artist}&album=${album}&format=json`;
        console.log(url);

        fetch(url)
            .then((response) => {
                return response.json();
            })
            .then((result) => {
                console.log(result);

                let res = result.album;
                let albumName = res.name;
                let artist = res.artist;
                let cover = res.image[1]["#text"];
                let tracks = res.tracks.track;
                let albumTracks = [];

                for (let i = 0; i < tracks.length; i++) {
                    albumTracks.push(tracks[i].name);
                }

                this.setState({
                    album: {
                        albumName: albumName,
                        artist: artist,
                        cover: cover,
                        albumTracks: albumTracks
                    },
                    albumDisplay: true
                });
            });

    }


    //PLAY PREVIEW
    spotifyPreview(e) {
        if (stopSong !== undefined) {
            clearTimeout(stopSong);
        }
        let target = e.target;
        let playing = this.state.playing;
        let stop = document.getElementsByClassName("stop");
        if (playing !== undefined && playing !== null) {
            playing.pause();
        }

        let url = e.target.attributes['data-preview'].value;
        let audio = document.createElement("audio");
        audio.src = url;
        this.setState({playing: audio, isPlaying: true, playingSong: url});
        audio.play();
        stopSong = setTimeout(() => {
            this.setState({playingSong: ''});
        }, 30000);
    }

    //STOP PLAYING
    stopPreview(e) {
        this.state.playing.pause();
        this.setState({isPlaying: false, playingSong: ''});
    }

    closeBio() {
        this.setState({
            bioDisplay: !this.state.bioDisplay
        });
    }

    closeAlbum() {
        this.setState({
            albumDisplay: !this.state.albumDisplay
        });
    }

    statusChange(status, message) {
        if (messageExists !== undefined) {
            clearTimeout(messageExists);
        }

        this.setState({
            statusCode: status,
            statusMessage: message
        });

        messageExists = setTimeout(() => {
            this.setState({
                statusCode: '',
                statusMessage: ''
            });
        }, 3000);
    }

    //RENDER
    render() {
        return (
            <div className="container-fluid">
                {this.state.statusCode === 'success' &&
                <div className="success">
                    <h4>{this.state.statusMessage}</h4>
                </div>
                }
                {this.state.statusCode === 'error' &&
                <div className="error">
                    <h4>{this.state.statusMessage}</h4>
                </div>
                }
                <Header
                    loginStatus={this.state.loggedIn}
                    handleLogIn={this.handleLogIn}
                    handleLogOut={this.handleLogOut}
                    userName={this.state.user.name}
                    userPicture={this.state.user.photo}
                    handleFavorites={this.handleFavorites}
                    headerAction={this.state.headerAction}
                    closeFavorites={this.closeFavorites}
                    favorites={this.state.favorites}
                    removeFavorite={this.removeFavorite}
                    filterInput={this.filterFavorites}
                    sortFavorites={this.sortFavorites}
                    getAlbum={this.getAlbumTracks}
                    getBio={this.getArtistBio}
                    toggleProfile={this.toggleProfile}
                    mobileAction={this.state.toggleProfile}
                    preview={this.spotifyPreview}
                    stopPreview={this.stopPreview}
                    songPlaying={this.state.playingSong}
                />
                {/*<!-- SEARCH CONTAINER -->*/}
                <div className="search-container">
                    <h1>Search for music</h1>
                    <form className="radio">
                        <input onChange={this.searchType} type="radio" name="type" value="track" id="track"
                               className="radio-btn" checked={this.state.radioVal === "track"}/>
                        <label htmlFor="track" className="radio-label">Track</label>
                        <input onChange={this.searchType} type="radio" name="type" value="album" id="album"
                               className="radio-btn" checked={this.state.radioVal === "album"}/>
                        <label htmlFor="album" className="radio-label">Album</label>
                        <input onChange={this.searchType} type="radio" name="type" value="artist" id="artist"
                               className="radio-btn" checked={this.state.radioVal === "artist"}/>
                        <label htmlFor="artist" className="radio-label">Artist</label>
                    </form>
                    <div className="search-field-container">
                        {/*<!-- SEARCH INPUT -->*/}
                        <input onChange={this.searchInput} onKeyUp={this.searchInput} type="text" id="main-search"
                               placeholder="Search"
                               value={this.state.searchVal}/>
                        <i onClick={this.findResults} id="searchBtn" className="material-icons">search</i>
                    </div>
                    {/* <!-- Boxen som visas när man har sökt -->*/}
                    <div className="results-container">
                        <div className="row">
                            {!this.state.bioDisplay &&
                            <div className="col-lg-3 col-md-6 col-xs-12 col-sm-12 bio invisible">
                            </div>
                            }
                            {this.state.bioDisplay &&
                            <div className="col-lg-3 col-md-6 col-xs-12 col-sm-12 bio">
                                {/*BIOGRAPHY*/}
                                <Bio status={this.state.bioDone} similar={this.state.bioSimilar}
                                     summary={this.state.bioSummary} name={this.state.bioName}
                                     coverImg={this.state.bioImg} closeBio={this.closeBio}/>
                            </div>
                            }
                            {!this.state.searchDisplay &&
                            <div className="col-lg-6 col-md-12 col-xs-12 col-sm-12 search invisible">
                                <div id="searchResults" className="search-results">
                                </div>
                            </div>
                            }
                            {this.state.searchDisplay &&
                            <div className="col-lg-6 col-md-12 col-xs-12 col-sm-12 search">
                                <div id="searchResults" className="search-results">
                                    {/*SEARCH RESULTS*/}
                                    <SearchResults
                                        sortResults={this.sortSearch}
                                        sendFav={this.sendToFavorites}
                                        getBio={this.getArtistBio}
                                        results={this.state.results}
                                        getAlbum={this.getAlbumTracks}
                                        preview={this.spotifyPreview}
                                        loginStatus={this.state.loggedIn}
                                        isPlaying={this.state.isPlaying}
                                        stopPreview={this.stopPreview}
                                        songPlaying={this.state.playingSong}
                                    />
                                    {/*QOUTE OF THE DAY*/}
                                    <Quote title={this.state.quoteTitle} quote={this.state.quote}
                                           author={this.state.quoteAuthor}/>
                                </div>
                            </div>
                            }
                            {!this.state.albumDisplay &&
                            <div className="col-lg-3 col-md-6 col-xs-12 col-sm-12 lyric invisible">
                            </div>
                            }
                            {this.state.albumDisplay &&
                            <div className="col-lg-3 col-md-6 col-xs-12 col-sm-12 lyric">
                                <AlbumTracks album={this.state.album} closeAlbum={this.closeAlbum}/>
                            </div>
                            }
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}
//END APP

//ALBUM TRACKS
class AlbumTracks extends React.Component {
    render() {


        return (
            <div className="albumTracks">
                <div className="relative">
                    <i className="material-icons absolute clickable" onClick={this.props.closeAlbum}>close</i>
                    <img src={this.props.album.cover} alt="cover" className="album-image"/>
                    <h2>{this.props.album.artist}</h2>
                    <h3>{this.props.album.albumName}</h3>
                    <ul>
                        {this.props.album.albumTracks.map((track, index) => {
                            return (
                                <li key={index}>{track}</li>
                            );
                        })}
                    </ul>
                    <img className="lastFM" src="./rescources/lastfm_black_small.gif" alt="lastFM"/>
                </div>
            </div>
        );
    }
}

//QUOTES
class Quote extends React.Component {
    render() {

        return (
            <div className="quote">
                <h3>{this.props.title}.</h3>
                <p>{this.props.quote}</p>
                <h5>By: {this.props.author}</h5>
                {/*<span className="spanStyle">
                 <img src="https://theysaidso.com/branding/theysaidso.png" height="20" width="20" alt="theysaidso.com"/>
                 <a href="https://theysaidso.com" title="Powered by quotes from theysaidso.com"
                 className="anchorStyle"
                 >theysaidso.com</a>
                 </span>*/}
            </div>
        );
    }
}

//BIOGRAPHY
class Bio extends React.Component {
    render() {
        let result = this.props;
        return (
            <div className="biography">
                {result.status === false &&
                <div>
                    <h3>Loading...</h3>
                </div>
                }
                {result.status === true &&
                <div className="relative">
                    <i className="material-icons absolute clickable" onClick={this.props.closeBio}>close</i>
                    <img src={this.props.coverImg} alt="cover" className="bio-image"/>
                    <h2>{this.props.name}</h2>
                    <div>
                        <h3>Similar Artists:</h3>
                        <p>
                            {this.props.similar.map((artist, index) => {
                                    if (index === this.props.similar.length - 1) {
                                        return (<a href={artist.url} target="_blank" className="similar-artist"
                                                   key={index}>{artist.name}</a>);
                                    } else {
                                        return (<a href={artist.url} target="_blank" className="similar-artist"
                                                   key={index}>{artist.name}, </a>);
                                    }
                                }
                            )}
                        </p>
                        <h3>Band Biography</h3>
                        <p dangerouslySetInnerHTML={{__html: this.props.summary}}></p>
                    </div>
                    <img className="lastFM" src="./rescources/lastfm_black_small.gif" alt="lastFM"/>
                </div>
                }
            </div>
        );
    }
}


//SEARCHRESULTS
class SearchResults extends React.Component {
    render() {

        let results = this.props.results;
        let searchType;
        if (results.length > 0) {
            searchType = results[0].searchType;
        }

        return (
            <div className="table-container">
                <table id="resultTable">
                    <thead>
                    {searchType === "track" &&
                    <tr>
                        <th onClick={this.props.sortResults} data-sort="track">Track<i className="material-icons">arrow_drop_down</i>
                        </th>
                        <th onClick={this.props.sortResults} data-sort="artist">Artist<i className="material-icons">arrow_drop_down</i>
                        </th>
                        <th onClick={this.props.sortResults} data-sort="album">Album<i className="material-icons">arrow_drop_down</i>
                        </th>
                    </tr>
                    }
                    {searchType === "artist" &&
                    <tr>
                        <th>Cover</th>
                        <th onClick={this.props.sortResults} data-sort="artist">Artist<i className="material-icons">arrow_drop_down</i>
                        </th>
                    </tr>
                    }
                    {searchType === "album" &&
                    <tr>
                        <th>Cover</th>
                        <th onClick={this.props.sortResults} data-sort="artist">Artist<i className="material-icons">arrow_drop_down</i>
                        </th>
                        <th onClick={this.props.sortResults} data-sort="album">Album<i className="material-icons">arrow_drop_down</i>
                        </th>
                    </tr>

                    }

                    </thead>
                    <tbody>

                    {
                        this.props.results.map((result, index) => {

                            if (result.searchType === "track") {
                                return (
                                    <tr key={index}>
                                        <td data-th="Track">{result.track}</td>
                                        <td data-th="Artist" className="clickable"
                                            onClick={this.props.getBio}>{result.artist}</td>
                                        <td data-th="Album" className="clickable"
                                            onClick={this.props.getAlbum}>{result.album}</td>
                                        <td data-th="Spotify" data-link={result.openSpotify} className="clickable"><a
                                            href={result.openSpotify} target="_blank">Spotify</a></td>

                                        {this.props.songPlaying === result.preview && window.innerWidth > 768 &&
                                        <td style={{textAlign: 'center'}} data-th="Preview"><i
                                            onClick={this.props.stopPreview}
                                            className="material-icons stop">stop</i>
                                        </td>
                                        }

                                        {this.props.songPlaying !== result.preview && window.innerWidth > 768 &&
                                        <td data-th="Preview" onClick={this.props.preview}
                                            data-preview={result.preview} className="clickable">
                                            Preview
                                        </td>
                                        }

                                        {this.props.songPlaying === result.preview && window.innerWidth < 768 &&
                                        <td data-th="Preview"><i
                                            onClick={this.props.stopPreview}
                                            className="material-icons stop">stop</i>
                                        </td>
                                        }

                                        {this.props.songPlaying !== result.preview && window.innerWidth < 768 &&
                                        <td data-th="Preview" onClick={this.props.preview}
                                            data-preview={result.preview} className="clickable">
                                            Preview
                                        </td>
                                        }

                                        {this.props.loginStatus &&
                                        <td data-th="Favorite"><i onClick={this.props.sendFav}
                                                                  className="material-icons heart">favorite</i></td>
                                        }
                                    </tr>
                                );
                            }
                            else if (result.searchType === "album") {
                                return (
                                    <tr key={index}>
                                        <td data-th="Cover"><img src={result.cover} alt="cover" className="coverPic"/>
                                        </td>
                                        <td data-th="Artist" onClick={this.props.getBio}
                                            className="clickable">{result.artist}</td>
                                        <td data-th="Album" onClick={this.props.getAlbum}
                                            className="clickable">{result.album}</td>
                                        <td data-th="Spotify"><a href={result.openSpotify} target="_blank">Spotify</a>
                                        </td>

                                    </tr>
                                );
                            }
                            else if (result.searchType === "artist") {

                                return (
                                    <tr key={index}>
                                        <td data-th="Cover"><img src={result.cover} alt="cover" className="coverPic"/>
                                        </td>
                                        <td data-th="Artist" onClick={this.props.getBio}
                                            className="clickable">{result.artist}</td>
                                        <td data-th="Spotify"><a href={result.openSpotify} target="_blank">Spotify</a>
                                        </td>

                                    </tr>
                                );
                            }

                        })
                    }
                    </tbody>

                </table>
            </div>
        );
    }
}

//HEADER
class Header extends React.Component {
    render() {
        if (!this.props.loginStatus) {
            return (
                <header className="header">
                    <img src="./rescources/logo.png" alt="MusicSearch" className="logo"/>
                    <div className="log-in-container no-login" id="container">
                        <button type="button" className="btn" id="log-in" onClick={this.props.handleLogIn}>Log in
                        </button>
                    </div>
                </header>
            );
        } else if (this.props.loginStatus) {
            return (
                <header className="header">
                    <img src="./rescources/logo.png" alt="MusicSearch" className="logo"/>
                    {this.props.headerAction !== 'favorites' &&
                    <div>
                        {window.innerWidth < 768 ? (
                            <img src={this.props.userPicture} alt="userPicture"
                                 className="profile-picture mobile-profile" onClick={this.props.toggleProfile}/>
                        ) : (
                            <div className="log-in-container">
                                <div className="user-box">
                                    <img src={this.props.userPicture} alt="userPicture" className="profile-picture"/>
                                    <h4>{this.props.userName}</h4>
                                    <hr className="divider"/>
                                    <span className="favorites clickable" onClick={this.props.handleFavorites}><i
                                        className="material-icons">favorite</i>Favorites</span>
                                    <span className="log-out clickable" id="log-out"
                                          onClick={this.props.handleLogOut}>Log out</span>
                                </div>
                            </div>
                        )}
                        {this.props.mobileAction &&
                        <div className="log-in-container">
                            <div className="user-box">
                                <img src={this.props.userPicture} alt="userPicture" className="profile-picture"/>
                                <h4>{this.props.userName}</h4>
                                <i className="material-icons close" onClick={this.props.toggleProfile}>close</i>
                                <hr className="divider"/>
                                <span className="favorites" onClick={this.props.handleFavorites}><i
                                    className="material-icons">favorite</i>Favorites</span>
                                <span className="log-out" id="log-out"
                                      onClick={this.props.handleLogOut}>Log out</span>
                            </div>
                        </div>
                        }
                    </div>
                    }
                    {this.props.headerAction === 'favorites' &&
                    <div className="log-in-container favorite-container">
                        <div className="user-box max-height">
                            <img src={this.props.userPicture} alt="userPicture" className="profile-picture"/>
                            <h4>{this.props.userName}</h4>
                            <i className="material-icons clickable" onClick={this.props.closeFavorites}>close</i>
                            <hr className="divider"/>
                            <h3>Favorites</h3>
                            <div className="favorite-search-wrap">
                                <input type="text" className="filter-favorites" placeholder="Search"
                                       onChange={this.props.filterInput}/>
                                <i className="material-icons">search</i>
                            </div>
                            {this.props.favorites.length === 0 &&
                            <h3 className="smaller">Du har inga favoriter :(</h3>
                            }
                            {this.props.favorites.length > 0 &&
                            <div className="table-container table-overflow">
                                <table>
                                    <tbody>
                                    <tr>
                                        <th onClick={this.props.sortFavorites} data-sort="track">Track<i
                                            className="material-icons">arrow_drop_down</i></th>
                                        <th onClick={this.props.sortFavorites} data-sort="artist">Artist<i
                                            className="material-icons">arrow_drop_down</i></th>
                                        <th onClick={this.props.sortFavorites} data-sort="album">Album<i
                                            className="material-icons">arrow_drop_down</i></th>
                                        <th onClick={this.props.sortFavorites} data-sort="default">Default<i
                                            className="material-icons">arrow_drop_down</i></th>
                                    </tr>
                                    {this.props.favorites.map((favorite, index) =>
                                        <tr key={index} data-id={favorite.id}>
                                            <td data-th="Track">{favorite.track}</td>
                                            <td data-th="Artist" onClick={this.props.getBio}
                                                className="clickable">{favorite.artist}</td>
                                            <td data-th="Album" onClick={this.props.getAlbum}
                                                className="clickable">{favorite.album}</td>
                                            <td data-th="Spotify" className="clickable">
                                                <a href={favorite.spotify} target="_blank">Spotify</a>
                                            </td>

                                            {this.props.songPlaying === favorite.preview && window.innerWidth > 768 &&
                                            <td style={{textAlign: 'center'}} data-th="Preview"><i
                                                onClick={this.props.stopPreview}
                                                className="material-icons stop">stop</i>
                                            </td>
                                            }

                                            {this.props.songPlaying !== favorite.preview && window.innerWidth > 768 &&
                                            <td data-th="Preview" onClick={this.props.preview}
                                                data-preview={favorite.preview} className="clickable">
                                                Preview
                                            </td>
                                            }

                                            {this.props.songPlaying === favorite.preview && window.innerWidth < 768 &&
                                            <td data-th="Preview"><i
                                                onClick={this.props.stopPreview}
                                                className="material-icons stop">stop</i>
                                            </td>
                                            }

                                            {this.props.songPlaying !== favorite.preview && window.innerWidth < 768 &&
                                            <td data-th="Preview" onClick={this.props.preview}
                                                data-preview={favorite.preview} className="clickable">
                                                Preview
                                            </td>
                                            }

                                            <td data-th="Remove"><i className="material-icons heart"
                                                                    onClick={this.props.removeFavorite}>favorite</i>
                                            </td>
                                        </tr>
                                    )}
                                    </tbody>
                                </table>
                            </div>
                            }
                        </div>
                    </div>
                    }

                </header>
            );
        }
    }
}


//=======================================================
//GLOBALS
var AppComp = document.getElementById("App");
var stopSong; //setTimeout
var messageExists; //setTimeout
//=======================================================
//MAIN

ReactDOM.render(<App/>, AppComp);
