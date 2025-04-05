import json
import datetime
import uuid

from sqlalchemy import create_engine, Column, String, DateTime, Text, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from sqlalchemy.types import TypeDecorator, TEXT

# Custom JSON type to store complex objects
class JSONEncodedDict(TypeDecorator):
    impl = TEXT

    def process_bind_param(self, value, dialect):
        if value is None:
            return None
        return json.dumps(value)

    def process_result_value(self, value, dialect):
        if value is None:
            return None
        return json.loads(value)

# SQLAlchemy setup
Base = declarative_base()
engine = create_engine('sqlite:///moti_do.db', echo=False)
SessionLocal = sessionmaker(bind=engine)

# ORM Models
class UserModel(Base):
    __tablename__ = 'users'
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    active_since = Column(DateTime, default=datetime.datetime.now)
    last_update = Column(DateTime, default=datetime.datetime.now, onupdate=datetime.datetime.now)
    xp_log = Column(JSONEncodedDict)
    xp_ledger = Column(JSONEncodedDict)
    score_preferences = Column(JSONEncodedDict)
    tasks = relationship("TaskModel", back_populates="user", cascade="all, delete-orphan")
    tags = relationship("TagModel", back_populates="user", cascade="all, delete-orphan")
    projects = relationship("ProjectModel", back_populates="user", cascade="all, delete-orphan")

class TaskModel(Base):
    __tablename__ = 'tasks'
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey('users.id'), nullable=False)
    name = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.now)
    updated_at = Column(DateTime, default=datetime.datetime.now, onupdate=datetime.datetime.now)
    description = Column(Text)
    emoji = Column(String)
    start_date = Column(DateTime)
    due_date = Column(DateTime)
    completed_at = Column(DateTime)
    status = Column(String, default="active")
    importance = Column(String)  # store selector
    difficulty = Column(String)
    duration = Column(String)
    subtasks = Column(JSONEncodedDict)
    dependency_ids = Column(JSONEncodedDict)
    dependent_ids = Column(JSONEncodedDict)
    tag_ids = Column(JSONEncodedDict)
    project_id = Column(String)
    change_tracker = Column(JSONEncodedDict)
    recurrence = Column(JSONEncodedDict)
    habit_tracking = Column(JSONEncodedDict)
    user = relationship("UserModel", back_populates="tasks")

class TagModel(Base):
    __tablename__ = 'tags'
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey('users.id'), nullable=False)
    name = Column(String, nullable=False)
    emoji = Column(String)
    color = Column(String)
    description = Column(Text)
    task_ids = Column(JSONEncodedDict)
    user = relationship("UserModel", back_populates="tags")

class ProjectModel(Base):
    __tablename__ = 'projects'
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey('users.id'), nullable=False)
    name = Column(String, nullable=False)
    emoji = Column(String)
    color = Column(String)
    description = Column(Text)
    task_ids = Column(JSONEncodedDict)
    user = relationship("UserModel", back_populates="projects")

# Create all tables
Base.metadata.create_all(engine)

# Domain model conversion helpers
from ..task import User, Task, Tag, Project, ScorePreferences, XPLog, LedgerLog

def _user_model_to_domain(user_model: UserModel) -> User:
    user = User(
        name=user_model.name,
        active_since=user_model.active_since,
        last_update=user_model.last_update,
        tasks=[_task_model_to_domain(t) for t in user_model.tasks],
        tags=[_tag_model_to_domain(t) for t in user_model.tags],
        projects=[_project_model_to_domain(p) for p in user_model.projects],
        xp_log=user_model.xp_log if user_model.xp_log is not None else [],
        xp_ledger=user_model.xp_ledger if user_model.xp_ledger is not None else [],
        score_preferences=user_model.score_preferences if user_model.score_preferences is not None else ScorePreferences()
    )
    setattr(user, 'id', user_model.id)
    return user

def _task_model_to_domain(task_model: TaskModel) -> Task:
    task = Task(
        name=task_model.name,
        description=task_model.description,
        emoji=task_model.emoji,
        start_date=task_model.start_date,
        due_date=task_model.due_date,
        completed_at=task_model.completed_at,
        status=task_model.status,
        importance=task_model.importance,
        difficulty=task_model.difficulty,
        duration=task_model.duration,
        subtasks=task_model.subtasks if task_model.subtasks is not None else [],
        dependency_ids=task_model.dependency_ids if task_model.dependency_ids is not None else [],
        dependent_ids=task_model.dependent_ids if task_model.dependent_ids is not None else [],
        tag_ids=task_model.tag_ids if task_model.tag_ids is not None else [],
        project_id=task_model.project_id,
        recurrence=task_model.recurrence,
        habit_tracking=task_model.habit_tracking
    )
    setattr(task, 'id', task_model.id)
    setattr(task, 'created_at', task_model.created_at)
    setattr(task, 'updated_at', task_model.updated_at)
    setattr(task, 'change_tracker', task_model.change_tracker if task_model.change_tracker is not None else {})
    return task

def _tag_model_to_domain(tag_model: TagModel) -> Tag:
    tag = Tag(
        name=tag_model.name,
        emoji=tag_model.emoji,
        color=tag_model.color,
        description=tag_model.description,
        task_ids=tag_model.task_ids if tag_model.task_ids is not None else []
    )
    setattr(tag, 'id', tag_model.id)
    return tag

def _project_model_to_domain(project_model: ProjectModel) -> Project:
    project = Project(
        name=project_model.name,
        emoji=project_model.emoji,
        color=project_model.color,
        description=project_model.description,
        task_ids=project_model.task_ids if project_model.task_ids is not None else []
    )
    setattr(project, 'id', project_model.id)
    return project

def _user_domain_to_model(user: User) -> UserModel:
    user_model = UserModel(
        id=getattr(user, 'id', str(uuid.uuid4())),
        name=user.name,
        active_since=user.active_since,
        last_update=user.last_update,
        xp_log=user.xp_log,
        xp_ledger=user.xp_ledger,
        score_preferences=user.score_preferences
    )
    return user_model

def _task_domain_to_model(task: Task, user_id: str) -> TaskModel:
    task_model = TaskModel(
        id=getattr(task, 'id', str(uuid.uuid4())),
        user_id=user_id,
        name=task.name,
        created_at=task.created_at,
        updated_at=task.updated_at,
        description=task.description,
        emoji=task.emoji,
        start_date=task.start_date,
        due_date=task.due_date,
        completed_at=task.completed_at,
        status=task.status,
        importance=task.importance,
        difficulty=task.difficulty,
        duration=task.duration,
        subtasks=task.subtasks,
        dependency_ids=task.dependency_ids,
        dependent_ids=task.dependent_ids,
        tag_ids=task.tag_ids,
        project_id=task.project_id,
        change_tracker=task.change_tracker,
        recurrence=task.recurrence,
        habit_tracking=task.habit_tracking
    )
    return task_model

def _tag_domain_to_model(tag: Tag, user_id: str) -> TagModel:
    tag_model = TagModel(
        id=getattr(tag, 'id', str(uuid.uuid4())),
        user_id=user_id,
        name=tag.name,
        emoji=tag.emoji,
        color=tag.color,
        description=tag.description,
        task_ids=tag.task_ids
    )
    return tag_model

def _project_domain_to_model(project: Project, user_id: str) -> ProjectModel:
    project_model = ProjectModel(
        id=getattr(project, 'id', str(uuid.uuid4())),
        user_id=user_id,
        name=project.name,
        emoji=project.emoji,
        color=project.color,
        description=project.description,
        task_ids=project.task_ids
    )
    return project_model

# Repository Implementations
from ..repository import IUserRepository, ITaskRepository, ITagRepository, IProjectRepository

class SqliteUserRepository(IUserRepository):
    """Implementation of IUserRepository using SQLite via SQLAlchemy."""
    def __init__(self):
        self.session_factory = SessionLocal

    def get_by_id(self, id: str):
        session = self.session_factory()
        try:
            user_model = session.query(UserModel).filter(UserModel.id == id).first()
            if user_model:
                return _user_model_to_domain(user_model)
            return None
        finally:
            session.close()

    def get_all(self):
        session = self.session_factory()
        try:
            user_models = session.query(UserModel).all()
            return [_user_model_to_domain(u) for u in user_models]
        finally:
            session.close()

    def save(self, entity: User) -> None:
        session = self.session_factory()
        try:
            existing = session.query(UserModel).filter(UserModel.id == getattr(entity, 'id', None)).first()
            if existing:
                existing.name = entity.name
                existing.active_since = entity.active_since
                existing.last_update = entity.last_update
                existing.xp_log = entity.xp_log
                existing.xp_ledger = entity.xp_ledger
                existing.score_preferences = entity.score_preferences
            else:
                user_model = _user_domain_to_model(entity)
                session.add(user_model)
            session.commit()
        except Exception as e:
            session.rollback()
            print(f"Error saving user: {e}")
        finally:
            session.close()

    def delete(self, id: str) -> None:
        session = self.session_factory()
        try:
            user_model = session.query(UserModel).filter(UserModel.id == id).first()
            if user_model:
                session.delete(user_model)
                session.commit()
        except Exception as e:
            session.rollback()
            print(f"Error deleting user: {e}")
        finally:
            session.close()

    def get_by_name(self, name: str):
        session = self.session_factory()
        try:
            user_model = session.query(UserModel).filter(UserModel.name == name).first()
            if user_model:
                return _user_model_to_domain(user_model)
            return None
        finally:
            session.close()

class SqliteTaskRepository(ITaskRepository):
    """Implementation of ITaskRepository using SQLite via SQLAlchemy."""
    def __init__(self):
        self.session_factory = SessionLocal

    def get_by_id(self, id: str, user_id: str):
        session = self.session_factory()
        try:
            task_model = session.query(TaskModel).filter(TaskModel.id == id, TaskModel.user_id == user_id).first()
            if task_model:
                return _task_model_to_domain(task_model)
            return None
        finally:
            session.close()

    def get_all(self, user_id: str):
        session = self.session_factory()
        try:
            task_models = session.query(TaskModel).filter(TaskModel.user_id == user_id).all()
            return [_task_model_to_domain(t) for t in task_models]
        finally:
            session.close()

    def save(self, entity: Task, user_id: str) -> None:
        session = self.session_factory()
        try:
            task_model = session.query(TaskModel).filter(TaskModel.id == getattr(entity, 'id', None), TaskModel.user_id == user_id).first()
            if task_model:
                task_model.name = entity.name
                task_model.updated_at = entity.updated_at
                task_model.description = entity.description
                task_model.emoji = entity.emoji
                task_model.start_date = entity.start_date
                task_model.due_date = entity.due_date
                task_model.completed_at = entity.completed_at
                task_model.status = entity.status
                task_model.importance = entity.importance
                task_model.difficulty = entity.difficulty
                task_model.duration = entity.duration
                task_model.subtasks = entity.subtasks
                task_model.dependency_ids = entity.dependency_ids
                task_model.dependent_ids = entity.dependent_ids
                task_model.tag_ids = entity.tag_ids
                task_model.project_id = entity.project_id
                task_model.change_tracker = entity.change_tracker
                task_model.recurrence = entity.recurrence
                task_model.habit_tracking = entity.habit_tracking
            else:
                new_task_model = _task_domain_to_model(entity, user_id)
                session.add(new_task_model)
            session.commit()
        except Exception as e:
            session.rollback()
            print(f"Error saving task: {e}")
        finally:
            session.close()

    def delete(self, id: str, user_id: str) -> None:
        session = self.session_factory()
        try:
            task_model = session.query(TaskModel).filter(TaskModel.id == id, TaskModel.user_id == user_id).first()
            if task_model:
                session.delete(task_model)
                session.commit()
        except Exception as e:
            session.rollback()
            print(f"Error deleting task: {e}")
        finally:
            session.close()

class SqliteTagRepository(ITagRepository):
    """Implementation of ITagRepository using SQLite via SQLAlchemy."""
    def __init__(self):
        self.session_factory = SessionLocal

    def get_by_id(self, id: str, user_id: str):
        session = self.session_factory()
        try:
            tag_model = session.query(TagModel).filter(TagModel.id == id, TagModel.user_id == user_id).first()
            if tag_model:
                return _tag_model_to_domain(tag_model)
            return None
        finally:
            session.close()

    def get_all(self, user_id: str):
        session = self.session_factory()
        try:
            tag_models = session.query(TagModel).filter(TagModel.user_id == user_id).all()
            return [_tag_model_to_domain(t) for t in tag_models]
        finally:
            session.close()

    def save(self, entity: Tag, user_id: str) -> None:
        session = self.session_factory()
        try:
            tag_model = session.query(TagModel).filter(TagModel.id == getattr(entity, 'id', None), TagModel.user_id == user_id).first()
            if tag_model:
                tag_model.name = entity.name
                tag_model.emoji = entity.emoji
                tag_model.color = entity.color
                tag_model.description = entity.description
                tag_model.task_ids = entity.task_ids
            else:
                new_tag_model = _tag_domain_to_model(entity, user_id)
                session.add(new_tag_model)
            session.commit()
        except Exception as e:
            session.rollback()
            print(f"Error saving tag: {e}")
        finally:
            session.close()

    def delete(self, id: str, user_id: str) -> None:
        session = self.session_factory()
        try:
            tag_model = session.query(TagModel).filter(TagModel.id == id, TagModel.user_id == user_id).first()
            if tag_model:
                session.delete(tag_model)
                session.commit()
        except Exception as e:
            session.rollback()
            print(f"Error deleting tag: {e}")
        finally:
            session.close()

class SqliteProjectRepository(IProjectRepository):
    """Implementation of IProjectRepository using SQLite via SQLAlchemy."""
    def __init__(self):
        self.session_factory = SessionLocal

    def get_by_id(self, id: str, user_id: str):
        session = self.session_factory()
        try:
            project_model = session.query(ProjectModel).filter(ProjectModel.id == id, ProjectModel.user_id == user_id).first()
            if project_model:
                return _project_model_to_domain(project_model)
            return None
        finally:
            session.close()

    def get_all(self, user_id: str):
        session = self.session_factory()
        try:
            project_models = session.query(ProjectModel).filter(ProjectModel.user_id == user_id).all()
            return [_project_model_to_domain(p) for p in project_models]
        finally:
            session.close()

    def save(self, entity: Project, user_id: str) -> None:
        session = self.session_factory()
        try:
            project_model = session.query(ProjectModel).filter(ProjectModel.id == getattr(entity, 'id', None), ProjectModel.user_id == user_id).first()
            if project_model:
                project_model.name = entity.name
                project_model.emoji = entity.emoji
                project_model.color = entity.color
                project_model.description = entity.description
                project_model.task_ids = entity.task_ids
            else:
                new_project_model = _project_domain_to_model(entity, user_id)
                session.add(new_project_model)
            session.commit()
        except Exception as e:
            session.rollback()
            print(f"Error saving project: {e}")
        finally:
            session.close()

    def delete(self, id: str, user_id: str) -> None:
        session = self.session_factory()
        try:
            project_model = session.query(ProjectModel).filter(ProjectModel.id == id, ProjectModel.user_id == user_id).first()
            if project_model:
                session.delete(project_model)
                session.commit()
        except Exception as e:
            session.rollback()
            print(f"Error deleting project: {e}")
        finally:
            session.close() 